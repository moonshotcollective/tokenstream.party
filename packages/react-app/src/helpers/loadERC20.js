import { ethers } from "ethers";
import { ERC20ABI } from "../contracts/external_contracts";

export const loadERC20 = async (address, provider) => {
    try {
        const checksumAddress = ethers.utils.getAddress(address);
        const tokenContract = new ethers.Contract(checksumAddress, ERC20ABI, provider);
        const name = await tokenContract.name?.();
        const symbol = await tokenContract.symbol?.();
        return { name, symbol, address, tokenContract };
    } catch (error) {
        return {};
    }
};
