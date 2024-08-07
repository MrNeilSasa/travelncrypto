//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";


contract TravelnCrypto is Ownable, ReentrancyGuard {
    
    using Counters for Counters.Counter;
    Counters.Counter private _totalApartments;

    AggregatorV3Interface public ethUsdPriceFeed = AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);

    struct Apartment {
        uint id;
        string name; 
        string description;
        string location;
        string images;
        uint rooms;
        uint price;
        address owner;
        bool booked;
        bool deleted;
        uint timestamp;
    }

    struct Booking{
        uint id;
        uint apartment_id;
        address tenant;
        address resale_tenant;
        uint date;
        uint price;
        bool checked;
        bool cancelled;
        bool resale; 
        bool booked;
        bool dateRebooked;
    }

    struct Review {
        uint id;
        uint apartment_id;
        string reviewText;
        uint timestamp;
        address owner;
    }


    struct Resale {
        uint price;
        uint booking_id;
        uint date;
        address reseller;
        address new_tenant;
    }

    uint public securityFee;
    uint public taxPercent;

    mapping(uint => Apartment) apartments;
    mapping(uint => Booking[]) bookingsOf;
    mapping(uint => Review[]) reviewsOf;

    mapping(uint => mapping(uint => bool)) isDateBooked;
    mapping(address => mapping(uint => bool)) hasBooked;
    mapping(uint => bool) apartmentExist;
    mapping(uint => bool) bookingExist;
    
    mapping(uint => Resale) resales; //bookingId => Resale details
    uint[] public resoldBookingIds;
    mapping(uint => uint) resale_price; //booking_id => price
    mapping(uint => uint[]) availableResaleDates; //apartment_id => dates[]
    mapping(uint => mapping(uint => uint)) availableResoldBookingID; //apartment_id => (date => booking_id)

    constructor(uint _taxPercent, uint _securityFee) {
    taxPercent = _taxPercent;
    securityFee = _securityFee;
    
  }


    function createApartment(string memory name, string memory description, string memory location, string memory images, uint rooms, uint price) public{
        require(bytes(name).length > 0, 'Name cannot be empty');
        require(bytes(description).length > 0, 'Description cannot be empty');
        require(bytes(location).length > 0, 'Location cannot be empty');
        require(bytes(images).length > 0, 'Images cannot be empty');
        require(rooms > 0, 'Rooms cannot be zero');
        require(price > 0 ether, 'Price cannot be zero');

        _totalApartments.increment();

        Apartment memory apartment;

        apartment.id = _totalApartments.current();
        apartment.name = name;
        apartment.description = description;
        apartment.location = location;
        apartment.images = images;
        apartment.rooms = rooms;
        apartment.price = price;
        apartment.owner = msg.sender;
        apartment.timestamp = currentTimestamp();
        apartmentExist[apartment.id] = true;
        apartments[_totalApartments.current()] = apartment;

    }


    function currentTimestamp() internal view returns (uint256) {
        return (block.timestamp * 1000) + 1000;
    }


    function getAllApartments() public view returns(Apartment[] memory Apartments) {
            uint256 available;
            for (uint i = 1; i <= _totalApartments.current(); i++) {
            if (!apartments[i].deleted) available++;
            }

            Apartments = new Apartment[](available);

            uint256 index;
            for (uint i = 1; i <= _totalApartments.current(); i++) {
            if (!apartments[i].deleted) {
                Apartments[index++] = apartments[i];
            }
            }
        
    }

    function getApartment(uint id) public view returns (Apartment memory) {
        return apartments[id];
    }

    function updateApartment(uint id, string memory name, string memory description, string memory location, string memory images, uint rooms, uint price) public{
        require(apartmentExist[id] == true, 'Appartment not found');
        require(msg.sender == apartments[id].owner, 'Unauthorized personnel, owner only');
        require(bytes(name).length > 0, 'Name cannot be empty');
        require(bytes(description).length > 0, 'Description cannot be empty');
        require(bytes(location).length > 0, 'Location cannot be empty');
        require(bytes(images).length > 0, 'Images cannot be empty');
        require(rooms > 0, 'Rooms cannot be zero');
        require(price > 0 ether, 'Price cannot be zero');

        Apartment memory apartment = apartments[id];
        apartment.name = name;
        apartment.description = description;
        apartment.location = location;
        apartment.images = images;
        apartment.rooms = rooms;
        apartment.price = price;
        apartments[id] = apartment;

    }

    function updatePrice(uint id, uint usdprice) external  {
        require(apartmentExist[id] == true, 'Apartment not found');
        
    
        apartments[id].price = (getPrice() * usdprice); 


    }

    function createResale(uint apartment_id, uint newPrice, uint booking_id ) public {
        require(apartmentExist[apartment_id] == true, 'Apartment not found'); //Apartment must exist 

        Booking memory booking = getBooking(apartment_id, booking_id);
        require(booking.booked == true, "Apartment should be booked in order to be resold");
        require(msg.sender == booking.tenant, "Error: Unauthorized tenant!!");
        require(!booking.checked, "Error: You cannot put apartment up for resell when you have already checkedIn for this date!!");
        require(isDateBooked[apartment_id][booking.date], "You did not book for this date!!");


        uint scaledNewPrice = newPrice * 100;
        uint scaledOriginalPrice = apartments[apartment_id].price * 100;
        require(
            scaledNewPrice <= scaledOriginalPrice * 120 / 100,  
            "New price cannot exceed 120% of the original price"
        );

        resale_price[booking.id] = newPrice;
        bookingsOf[apartment_id][booking.id].resale = true;
        bookingsOf[apartment_id][booking.id].booked = false;
        isDateBooked[apartment_id][booking.date] = false;
        availableResaleDates[apartment_id].push(booking.date);
        availableResoldBookingID[apartment_id][booking.date] = booking.id;

            
        
    } 

    function getAllResales() public view returns (Resale[] memory){
        uint resaleCount = resoldBookingIds.length;
        Resale[] memory allResales = new Resale[](resaleCount);
        for (uint i = 0; i < resaleCount; i++) {
            uint bookingId = resoldBookingIds[i];
            allResales[i] = resales[bookingId];
        }   
        return allResales;
    }

    function deleteApartment(uint id) public {
        require(apartmentExist[id] == true, 'Apartment not found');
        require(apartments[id].owner == msg.sender, 'Unauthorized entity');

        apartmentExist[id] = false;
        apartments[id].deleted = true;
    }

    function bookApartment(uint apartment_id, uint[] memory dates, uint[] memory resale_dates) public payable {
        require(apartmentExist[apartment_id], "Error: Apartment cannot be found");
        uint regular_price = (apartments[apartment_id].price * dates.length) + (((apartments[apartment_id].price * dates.length) * securityFee)/100);
        uint resalePrice;
        for(uint x=0; x < resale_dates.length; x++){
            uint bookingId = availableResoldBookingID[apartment_id][resale_dates[x]];
            resalePrice += resale_price[bookingId];
        }
        require(msg.value >= ((regular_price + resalePrice) * securityFee)/100 ,
        "Insufficient fund!" );

        require(dateAvailability(apartment_id, dates), 'Error: This Date is already booked!! ');

        for(uint i =0; i < dates.length; i++){
            Booking memory booking;
            booking.apartment_id = apartment_id;
            booking.id = bookingsOf[apartment_id].length;
            booking.tenant = msg.sender;
            booking.resale_tenant = msg.sender;
            booking.date = dates[i];
            booking.price = apartments[apartment_id].price;
            isDateBooked[apartment_id][dates[i]] = true;
            booking.resale = false;
            booking.booked = true;
            booking.dateRebooked = false;
            bookingExist[booking.id] = true;
            bookingsOf[apartment_id].push(booking);
        }


        for(uint j =0; j < resale_dates.length; j++){
            uint bookingId = availableResoldBookingID[apartment_id][resale_dates[j]];
            require(bookingExist[bookingId], "Error: Booking cannot be found");
            Booking memory booking = bookingsOf[apartment_id][bookingId];
            require(booking.resale == true, "You cannot book this date");
            

            booking.resale_tenant = msg.sender;
            Resale memory resale;
            resale.price = resale_price[bookingId];
            resale.booking_id = bookingId;
            resale.date = resale_dates[j];
            resale.reseller = booking.tenant;
            resale.new_tenant = msg.sender;
            resales[bookingId] = resale;
            bookingsOf[apartment_id][bookingId].dateRebooked = true;
            bookingsOf[apartment_id][bookingId].booked = true; 
            bookingsOf[apartment_id][bookingId].resale_tenant = msg.sender;
            bookingsOf[apartment_id][bookingId].resale = false;
            isDateBooked[apartment_id][resale_dates[j]] = true;



        }
    }

    function dateAvailability(uint apartment_id, uint[] memory dates) internal view returns (bool){
        bool lastCheck = true;
        uint[] memory bookedDates = getUnavailableDates(apartment_id);
        for(uint i = 0; i < dates.length; i++){
            for(uint j = 0; j < bookedDates.length; j++){
                if(dates[i] == bookedDates[j]) {
                    lastCheck = false;
                }
            }
        }
        return lastCheck;
    }

    

    function getDisplayPrice(uint apartment_id, uint date) public view returns(uint) {
        require(apartmentExist[apartment_id], "Error: Apartment cannot be found");

        uint[] memory resaleDates = availableResaleDates[apartment_id]; 
        
        for(uint i=0; i < resaleDates.length; i++){
            if(resaleDates[i] == date){
                uint booking_id = availableResoldBookingID[apartment_id][date];
                Booking memory booking = getBooking(apartment_id, booking_id);
                return resale_price[booking.id]; 
            }
        }

        return 0;
    }

    function checkIn(uint apartment_id, uint booking_id) public {
        Booking memory booking = bookingsOf[apartment_id][booking_id];
        require(msg.sender == booking.tenant || msg.sender == booking.resale_tenant, "Error: Unauthorized tenant!!");
        require(!booking.checked, "Apartment already checked for this date Double checking is not premitted!!");

        bookingsOf[apartment_id][booking_id].checked = true;
        uint tax = (booking.price * taxPercent) / 100;
        uint fee = (booking.price * securityFee) / 100;

        hasBooked[msg.sender][apartment_id] = true;
        if(booking.tenant == msg.sender && booking.dateRebooked == false){
            payTo(apartments[apartment_id].owner, (booking.price - tax)); //Pays the the owner of the apartment
            payTo(owner(), tax); //Pays the owner of the contract the tax feed
            payTo(msg.sender, fee); //Pays the tennat back their secuirty fee
        }
        if(booking.resale_tenant == msg.sender && booking.dateRebooked == true){

            Resale memory resale = resales[booking_id];
            payTo(apartments[apartment_id].owner, (booking.price - tax));
            payTo(booking.tenant, (resale.price - tax));
            payTo(owner(), (tax + tax));
            payTo(msg.sender, fee);
            payTo(booking.tenant, fee);
        }
        
    }

    function payTo(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{ value: amount }('');
        require(success); //This require is the resaon we dont use .transfer because if it fails without this require the enitre function will revert
  }

  function refundBooking(uint apartment_id, uint booking_id) public nonReentrant() {
    Booking memory booking = bookingsOf[apartment_id][booking_id];
    require(!booking.checked, "Cannot refund after being checked IN!!!");
    require(isDateBooked[apartment_id][booking.date], "You did not book for this date!!");

    if(msg.sender != owner()){
        require(msg.sender == booking.tenant || msg.sender == booking.resale_tenant, "Error: You are not assigned to this booking");
        require(booking.date > currentTimestamp(), "Error: The booking date has already passed, you cannot refund.");
    }

    bookingsOf[apartment_id][booking_id].cancelled = true;
    bookingsOf[apartment_id][booking_id].booked = false;
    isDateBooked[apartment_id][booking.date] = false;

   

    


    uint fee = (booking.price * securityFee) / 100;
    uint collateral = fee / 2;

    if(booking.dateRebooked == false){
        payTo(apartments[apartment_id].owner, collateral);
        payTo(owner(), collateral);
        payTo(msg.sender, booking.price);
    }
    if(booking.dateRebooked == true){
        Resale memory resale = resales[booking_id];
        uint resale_fee = (resale.price * securityFee) / 100;
        uint resale_collateral = resale_fee/ 2;

        payTo(apartments[apartment_id].owner, collateral);
        payTo(owner(), resale_collateral);
        payTo(msg.sender, resale.price);
    }
  }

    function getUnavailableDates(uint apartment_id) public view returns (uint[] memory) {
        uint256 unavailable;
        for(uint i =0; i < bookingsOf[apartment_id].length; i++){
            if(bookingsOf[apartment_id][i].booked == true){
                unavailable++;
            }
        }
        uint[] memory unavailableDates = new uint[](unavailable);

            uint256 index;
            for (uint j = 0; j < bookingsOf[apartment_id].length; j++) {
                if (bookingsOf[apartment_id][j].booked == true) {
                    unavailableDates[index] = bookingsOf[apartment_id][j].date;
                    index++;

                }
            }

        return unavailableDates;
    }

    function getBooking(uint apartment_id, uint booking_id) public view returns (Booking memory) {
        return bookingsOf[apartment_id][booking_id];
    }

    function getAllBookings(uint apartment_id) public view returns (Booking[] memory) {
        return bookingsOf[apartment_id];
    }

    function tenantBooked(uint apartment_id) public view returns (bool) {
        return hasBooked[msg.sender][apartment_id];
    }

    function addReview(uint apartment_id, string memory message) public {
        require(apartmentExist[apartment_id], "Apartment is not available");
        require(hasBooked[msg.sender][apartment_id], "Must book apartment before you can review");
        require(bytes(message).length > 0, "You cannot leave an empty review!!");

        Review memory review;

        review.apartment_id = apartment_id;
        review.id = reviewsOf[apartment_id].length;
        review.reviewText = message;
        review.timestamp = currentTimestamp();
        review.owner = msg.sender;

        reviewsOf[apartment_id].push(review);
    }


    function getReviews(uint apartment_id) public view returns (Review[] memory) {
        return reviewsOf[apartment_id];
    }
  

    function getQualifiedReviewers(uint apartment_id) public view returns (address[] memory Tenants) {
        uint256 available;
        for (uint i = 0; i < bookingsOf[apartment_id].length; i++) {
            if (bookingsOf[apartment_id][i].checked){
                available++;
            } 
        }

        Tenants = new address[](available);

        uint256 index;
        for (uint i = 0; i < bookingsOf[apartment_id].length; i++) {
            if (bookingsOf[apartment_id][i].checked) {
                Tenants[index++] = bookingsOf[apartment_id][i].tenant;
            }
        }
  }

  function claimFunds(uint apartment_id, uint booking_id) public { //For claiming funds in the event there is no check in
    
    Booking memory booking = bookingsOf[apartment_id][booking_id];
    
    require(msg.sender == apartments[apartment_id].owner || msg.sender == owner(), 
    "Error: You are not authorized to claim any funds. If this is a mistake contact support");
    require(!bookingsOf[apartment_id][booking_id].checked, "Apartment is already checked In on this date no need to claim funds"); //No need to claim funds if person is already checked in
    require(booking.date < currentTimestamp(), "Not allowed to claim funds before the booking date!!");
    uint price = bookingsOf[apartment_id][booking_id].price;
    uint fee = (price * taxPercent) /100;

    payTo(apartments[apartment_id].owner, (price - fee));
    payTo(owner(), fee);
    payTo(msg.sender, securityFee);


  }

    function getPrice() public  view returns(uint256){
        (, int256 ethPrice, , , ) = ethUsdPriceFeed.latestRoundData();
        //Price of ETH in terms of USD
        //Price is in 8 decimal places and therefore must be raised by 1e10
        return uint256(ethPrice * 1e10);
    }





}