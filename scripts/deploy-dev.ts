import {ethers} from "hardhat";
const hre = require("hardhat");
import * as path from "path";
import * as fs from "fs";
import {NFTCreator} from "../client/src/types/contracts/contracts";

const contractName = "NFTCreator"

const saveArtifactAndAddressOnClient = async (
    name: string, // имя name должно совпадать с именем файла смарт-контракта
    contract: NFTCreator
) => {
    const contractsDir = path.join(__dirname, "./..", "client/src/assets/contracts/dev");

    if (!fs.existsSync(contractsDir)) {
        console.log("error")
        fs.mkdirSync(contractsDir, {recursive: true});
    }

    // сохраняем адрес смарт-контракта МАГАЗИНА
    fs.writeFileSync( // в этот файл записываем адрес смарт-контракта
        path.join(contractsDir, "/", "Shop-address.json"), // путь к файлу
        JSON.stringify({"address": contract.address}, undefined, 2), // его содержимое
    )

    // сохраняем артефакт смарт-контракта МАГАЗИНА
    // получаем артефакт смарт-контракта из ./artifacts/contracts/[имя контракта]
    const ShopArtifact = hre.artifacts.readArtifactSync(name);
    fs.writeFileSync(
        path.join(contractsDir, "/", "Shop-artifact.json"), // путь к файлу
        JSON.stringify(ShopArtifact, null, 2), // его содержимое
    )

    // сохраняем адрес смарт-контракта ТОКЕНА
    const tokenAddress = await contract.nftToken();
    fs.writeFileSync( // в этот файл записываем адрес смарт-контракта
        path.join(contractsDir, "/", "Token-address.json"), // путь к файлу
        JSON.stringify({"address": tokenAddress}, undefined, 2), // его содержимое
    )

    // сохраняем артефакт смарт-контракта ТОКЕНА
    // получаем артефакт смарт-контракта из ./artifacts/contracts/[имя контракта]
    const TokenArtifact = hre.artifacts.readArtifactSync("NFTToken");
    fs.writeFileSync(
        path.join(contractsDir, "/", "Token-artifact.json"), // путь к файлу
        JSON.stringify(TokenArtifact, null, 2), // его содержимое
    )
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const ContractFactory = await ethers.getContractFactory(contractName, deployer);
    const contract = await ContractFactory.deploy();
    await contract.deployed();
    await saveArtifactAndAddressOnClient(contractName, contract);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
