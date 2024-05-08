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

    function getApartment() public view returns(Apartment[] memory Apartments) {
        uint256 available;
        for(uint i = 1; i <= _totalApartments.current(); i++) {
            if (!apartments[i].deleted) {
                available++;
            }
        }

        Apartments = new Apartment[](available);

        uint256 index;
        for(uint i=1; i<= _totalApartments.current(); i++){
            if(!apartments[i].deleted){
                Apartments[index] = apartments[i];
                index++;
            }
        }
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

        require(datesAreCleared(apartment_id, dates), 'Error: This Date is already booked!! ');

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

    function datesAreCleared(uint apartment_id, uint[] memory dates) internal view returns (bool){
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
  
}