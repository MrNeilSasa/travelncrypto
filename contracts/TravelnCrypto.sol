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
        address tennat;
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
    mapping(uint => bool) appartmentExist;
    
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
    appartmentExist[apartment.id] = true;
    apartments[_totalApartments.current()] = apartment;

  }

  function currentTimestamp() internal view returns (uint256) {
    return (block.timestamp * 1000) + 1000;
  }
}