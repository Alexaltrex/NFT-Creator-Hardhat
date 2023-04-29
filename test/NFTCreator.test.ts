import {expect} from "chai";
import {ethers} from "hardhat";
import {loadFixture, time, setBalance} from "@nomicfoundation/hardhat-network-helpers";
import tokenArtefact from "../artifacts/contracts/NFTToken.sol/NFTToken.json";

describe("NFTCreator", () => {
    async function deployFixture() {
        const [owner, buyer, seller] = await ethers.getSigners();
        const ContractFactory = await ethers.getContractFactory("NFTCreator");
        const nftCreator = await ContractFactory.deploy();
        await nftCreator.deployed();

        //new ethers.Contract( address , abi , signerOrProvider )
        const nftCreatorSigner = ContractFactory.signer;
        const token = new ethers.Contract(await nftCreator.nftToken(), tokenArtefact.abi, nftCreatorSigner);
        return {owner, buyer, seller, nftCreator, token}
    }

    describe("Token Price For Buy", () => {
        it("getTokenPriceForBuy - correct value after deploy", async () => {
            const {owner, buyer, seller, nftCreator, token} = await loadFixture(deployFixture);
            expect(await nftCreator.getTokenPriceForBuy()).to.equal(100);
        })

        it("getTokenPriceForBuy, setTokenPriceForBuy - returns correct value after change", async () => {
            const {owner, buyer, seller, nftCreator, token} = await loadFixture(deployFixture);
            const newTokenPriceForBuy = 110;
            const setTokenPriceForBuyTx = await nftCreator.connect(owner).setTokenPriceForBuy(newTokenPriceForBuy);
            await setTokenPriceForBuyTx.wait();
            expect(await nftCreator.getTokenPriceForBuy()).to.equal(newTokenPriceForBuy);
        })

        it("setTokenPriceForBuy - can only call owner", async () => {
            const {owner, buyer, seller, nftCreator, token} = await loadFixture(deployFixture);
            const newTokenPriceForBuy = 110;
            await expect(nftCreator.connect(buyer).setTokenPriceForBuy(newTokenPriceForBuy))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setTokenPriceForBuy - cannot be set 0", async () => {
            const {owner, buyer, seller, nftCreator, token} = await loadFixture(deployFixture);
            const newTokenPriceForBuy = 0;
            await expect(nftCreator.connect(owner).setTokenPriceForBuy(newTokenPriceForBuy))
                .to.be.revertedWith("Token shop: price could not be equal 0");
        })

        it("setTokenPriceForBuy - raises the BuyPriceChange event with the correct arguments", async () => {
            const {owner, buyer, seller, nftCreator, token} = await loadFixture(deployFixture);
            const oldPrice = (await nftCreator.getTokenPriceForBuy()).toNumber();
            const newTokenPriceForBuy = 110;
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            expect(await nftCreator.connect(owner).setTokenPriceForBuy(newTokenPriceForBuy))
                .emit(nftCreator, "BuyPriceChange")
                .withArgs(oldPrice, newTokenPriceForBuy, timestamp)
        })
    })

    describe("createTokenAndBuy", () => {

        it("If the buyer sent the wrong amount of ether, an appropriate error is generated", async () => {
            const { owner, buyer, seller, nftCreator, token } = await loadFixture(deployFixture);
            const uri = "uri";
            const value = 99;
            await expect(nftCreator.connect(buyer).createTokenAndBuy(uri, {value}))
                .to.be.revertedWith("Token shop: wrong amount of ether")
        })

        it("The buyer becomes the owner of the created token - owner, tokenId, tokenURI", async () => {
            const { owner, buyer, seller, nftCreator, token } = await loadFixture(deployFixture);
            const uri = "uri";
            const value = 100;
            const totalSupply = (await token.totalSupply()).toNumber();
            const tx = await nftCreator.connect(buyer).createTokenAndBuy(uri, {value});
            await tx.wait();
            const tokenCountOfBuyer = await token.balanceOf(buyer.address);
            // tokenCountOfBuyer After = tokenCountOfBuyer Before(0) + 1
            expect(tokenCountOfBuyer).to.equal(1);
            const createdTokenId = (await token.tokenOfOwnerByIndex(buyer.address, tokenCountOfBuyer - 1)).toNumber();
            // createdTokenId === totalSupply + 1
            expect(createdTokenId).to.equal(totalSupply + 1);
            const tokenURI = await token.tokenURI(createdTokenId);
            // tokenURI === uri
            expect(tokenURI).to.equal(uri);
        })

        it("Buying a token correctly changes the buyer's and shop's ether balance", async () => {
            const {owner, buyer, seller, nftCreator, token} = await loadFixture(deployFixture);
            const uri = "uri";
            const value = 100;
            await expect(nftCreator.connect(buyer).createTokenAndBuy(uri, {value}))
                .to.changeEtherBalances([buyer, nftCreator], [-value, +value]);
        })

        it("Buying a token emit the correct event with the correct arguments", async () => {
            const {owner, buyer, seller, nftCreator, token} = await loadFixture(deployFixture);
            const uri = "uri";
            const value = 100;
            const createdTokenId = (await token.totalSupply()).toNumber() + 1;
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(nftCreator.connect(buyer).createTokenAndBuy(uri, {value}))
                .emit(nftCreator, "BuyFromShop")
                .withArgs(buyer.address, createdTokenId, value, timestamp);
        })

    })

    describe("getShopBalance", () => {

        it("Returns the correct value after buy a token from a shop", async () => {
            const {owner, buyer, seller, nftCreator, token} = await loadFixture(deployFixture);
            // getShopBalance => 0
            expect(await nftCreator.getShopBalance()).to.equal(0);
            // buyer покупает tokenId = 1
            const tokenUri = "tokenUri";
            const buyValue = 100;
            const tx = await nftCreator.connect(buyer).createTokenAndBuy(tokenUri, {value: buyValue});
            await tx.wait();
            // getShopBalance => buyValue (100)
            expect(await nftCreator.getShopBalance()).to.equal(buyValue);
        })

    })

    describe("withdrawAll", () => {
        it("Returns the correct value", async () => {
            const {owner, buyer, seller, nftCreator, token} = await loadFixture(deployFixture);
            expect(await nftCreator.getShopBalance()).to.equal(0);
            const balance = 1000;
            await setBalance(nftCreator.address, balance);
            expect(await nftCreator.getShopBalance()).to.equal(balance);

            await expect(nftCreator.connect(owner).withdrawAll())
                .to
                .changeEtherBalances([nftCreator, owner], [-balance, +balance]);
        })

    })

})
