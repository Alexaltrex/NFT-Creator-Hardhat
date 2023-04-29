// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./NFTToken.sol";

contract NFTCreator is Ownable {
    NFTToken public nftToken;

    uint _tokenPriceForBuy = 100; // цена покупки у магазина (wei / 1 Token)

    //========= EVENTS =========//
    event BuyPriceChange(uint oldValue, uint newValue, uint timestamp);
    event BuyFromShop(address indexed buyer, uint tokenId, uint price, uint timestamp); // покупка токена

    //========= CONSTRUCTOR =========//
    constructor() {
        nftToken = new NFTToken();
    }

    //========= GET TOKEN PRICE FOR BUY =========//
    function getTokenPriceForBuy() public view returns (uint) {
        return _tokenPriceForBuy;
    }

    //========= SET TOKEN PRICE FOR BUY =========//
    function setTokenPriceForBuy(uint tokenPriceForBuy_) external onlyOwner {
        require(tokenPriceForBuy_ != 0, "Token shop: price could not be equal 0");
        emit BuyPriceChange(_tokenPriceForBuy, tokenPriceForBuy_, block.timestamp);
        _tokenPriceForBuy = tokenPriceForBuy_;
    }

    //========= CREATE TOKEN AND BUY =========//
    function createTokenAndBuy(string memory uri) external payable {
        // покупатель прислал необходимое количество денег
        require(msg.value == _tokenPriceForBuy, "Token shop: wrong amount of ether");
        uint tokenId = nftToken.totalSupply() + 1;
        nftToken.safeMint(msg.sender, uri);
        emit BuyFromShop(msg.sender, tokenId, _tokenPriceForBuy, block.timestamp);
    }

    //========= GET SHOP BALANCE =========//
    function getShopBalance() public view onlyOwner returns (uint) {
        return address(this).balance;
    }

    //========= WITHDRAW ALL =========//
    function withdrawAll() public onlyOwner {
        address owner = owner();
        (bool success,) = owner.call{value : address(this).balance}("");
        require(success, "NFTShop: withdrawAll failed");
    }
}
