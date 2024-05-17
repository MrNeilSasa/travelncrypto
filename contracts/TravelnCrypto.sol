//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

contract TravelnCrypto is Ownable, ReentrancyGuard {
    
    using Counters for Counters.Counter;
    Counters.Counter private _totalApartments;

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
        uint date;
        uint price;
        bool checked;
        bool cancelled;
    }

    struct Review {
        uint id;
        uint apartment_id;
        string reviewText;
        uint timestamp;
        address owner;
    }

    uint public securityFee;
    uint public taxPercent;

    mapping(uint => Apartment) apartments;
    mapping(uint => Booking[]) bookingsOf;
    mapping(uint => Review[]) reviewsOf;
    mapping(uint => uint[]) bookedDates;
    mapping(uint => mapping(uint => bool)) isDateBooked;
    mapping(address => mapping(uint => bool)) hasBooked;
    mapping(uint => bool) apartmentExist;
    
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

    function deleteApartment(uint id) public {
        require(apartmentExist[id] == true, 'Apartment not found');
        require(apartments[id].owner == msg.sender, 'Unauthorized entity');

        apartmentExist[id] = false;
        apartments[id].deleted = true;
    }

    function bookApartment(uint apartment_id, uint[] memory dates) public payable {
        require(apartmentExist[apartment_id], "Error: Apartment cannot be found");
        require(msg.value >= (apartments[apartment_id].price * dates.length) + (((apartments[apartment_id].price * dates.length) * securityFee)/100 ),
        "Insufficent fund!" );

        require(dateAvailability(apartment_id, dates), 'Error: This Date is already booked!! ');

        for(uint i =0; i < dates.length; i++){
            Booking memory booking;
            booking.apartment_id = apartment_id;
            booking.id = bookingsOf[apartment_id].length;
            booking.tenant = msg.sender;
            booking.date = dates[i];
            booking.price = apartments[apartment_id].price;
            bookingsOf[apartment_id].push(booking);
            isDateBooked[apartment_id][dates[i]] = true;
            bookedDates[apartment_id].push(dates[i]);
        }
    }

    function dateAvailability(uint apartment_id, uint[] memory dates) internal view returns (bool){
        bool lastCheck = true;
        for(uint i = 0; i < dates.length; i++){
            for(uint j = 0; j < bookedDates[apartment_id].length; j++){
                if(dates[i] == bookedDates[apartment_id][j]) {
                    lastCheck = false;
                }
            }
        }
        return lastCheck;
    }

    function checkIn(uint apartment_id, uint booking_id) public {
        Booking memory booking = bookingsOf[apartment_id][booking_id];
        require(msg.sender == booking.tenant, "Error: Unauthorized tenant!!");
        require(!booking.checked, "Apartment already checked for this date Double checking is not premitted!!");

        bookingsOf[apartment_id][booking_id].checked = true;
        uint tax = (booking.price * taxPercent) / 100;
        uint fee = (booking.price * securityFee) / 100;

        hasBooked[msg.sender][apartment_id] = true;

        payTo(apartments[apartment_id].owner, (booking.price - tax)); //Pays the the owner of the apartment
        payTo(owner(), tax); //Pays the owner of the contract the tax feed
        payTo(msg.sender, fee); //Pays the tennat back their secuirty fee
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
        require(msg.sender == booking.tenant, "Error: You are not assigned to this booking");
        require(booking.date > currentTimestamp(), "Error: The booking date has already passed, you cannot refund.");
    }

    bookingsOf[apartment_id][booking_id].cancelled = true;
    isDateBooked[apartment_id][booking.date] = false;

    uint lastIndex = bookedDates[apartment_id].length - 1;
    uint lastBookingID = bookedDates[apartment_id][lastIndex];
    
    bookedDates[apartment_id][booking_id] = lastBookingID;
    bookedDates[apartment_id].pop();


    uint fee = (booking.price * securityFee) / 100;
    uint collateral = fee / 2;

    payTo(apartments[apartment_id].owner, collateral);
    payTo(owner(), collateral);
    payTo(msg.sender, booking.price);
  }

    function getUnavailableDates(uint apartment_id) public view returns (uint[] memory) {
        return bookedDates[apartment_id];
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


}