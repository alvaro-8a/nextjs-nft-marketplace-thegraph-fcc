import Head from "next/head"
import Image from "next/image"
import styles from "../styles/Home.module.css"
import { Button, Form, useNotification } from "web3uikit"
import { ethers } from "ethers"
import nftAbi from "../constants/BasicNft.json"
import { useMoralis, useWeb3Contract } from "react-moralis"
import { handleClientScriptLoad } from "next/script"
import nftMarketplaceAbi from "../constants/NftMarkeplace.json"
import networkMapping from "../constants/networkMapping.json"
import { useEffect, useState } from "react"

export default function Home() {
    const { chainId, account, isWeb3Enabled } = useMoralis()
    // 0x234
    const chainString = chainId ? parseInt(chainId).toString() : "31337"
    const marketplaceAddress = networkMapping[chainString].NftMarketplace[0]
    const dispatch = useNotification()
    const { runContractFunction } = useWeb3Contract()

    const [proceeds, setProceeds] = useState("0")

    async function setupUI() {
        console.log(proceeds)
        const proceedsReturned = await runContractFunction({
            params: {
                abi: nftMarketplaceAbi,
                contractAddress: marketplaceAddress,
                functionName: "getProceeds",
                params: {
                    seller: account,
                },
            },
            onError: (error) => {
                console.log(error)
            },
        })
        if (proceedsReturned) {
            setProceeds(proceedsReturned.toString())
        }
    }

    useEffect(() => {
        if (isWeb3Enabled) {
            setupUI()
        }
    }, [account, proceeds, isWeb3Enabled, chainId])

    async function approveAndList(data) {
        console.log("Approving...")
        const nftAddress = data.data[0].inputResult
        const tokenId = data.data[1].inputResult
        const price = ethers.utils.parseUnits(data.data[2].inputResult, "ether").toString()

        const approveOptions = {
            abi: nftAbi,
            contractAddress: nftAddress,
            functionName: "approve",
            params: {
                to: marketplaceAddress,
                tokenId: tokenId,
            },
        }

        await runContractFunction({
            params: approveOptions,
            onSuccess: () => {
                handleApproveSuccess(nftAddress, tokenId, price)
            },
            onError: (error) => {
                console.log(error)
            },
        })
    }

    async function handleApproveSuccess(nftAddress, tokenId, price) {
        console.log("Time to list")
        const listOptions = {
            abi: nftMarketplaceAbi,
            contractAddress: marketplaceAddress,
            functionName: "listItem",
            params: {
                nftAddress: nftAddress,
                tokenId: tokenId,
                price: price,
            },
        }

        await runContractFunction({
            params: listOptions,
            onSuccess: handleListSuccess,
            onError: (error) => {
                console.log(error)
            },
        })
    }

    const handleListSuccess = async (tx) => {
        await tx.wait(1)
        dispatch({
            type: "success",
            message: "NFT listing",
            title: "NFT listed",
            position: "topR",
        })
    }

    const handleWithdrawSuccess = async (tx) => {
        await tx.wait(1)
    }

    return (
        <div className={styles.container}>
            <Form
                onSubmit={approveAndList}
                data={[
                    {
                        name: "NFT Address",
                        type: "text",
                        inputWidth: "50%",
                        value: "",
                        key: "nftAddress",
                    },
                    {
                        name: "Token ID",
                        type: "number",
                        value: "",
                        key: "tokenId",
                    },
                    {
                        name: "Price (in ETH)",
                        type: "number",
                        value: "",
                        key: "price",
                    },
                ]}
                title="Sell your NFT!"
                id="Main Form"
            />
            <div>Withdraw {ethers.utils.formatUnits(proceeds, "ether")} ETH Proceeds</div>
            {proceeds != 0 ? (
                <Button
                    onClick={() => {
                        runContractFunction({
                            params: {
                                abi: nftMarketplaceAbi,
                                contractAddress: marketplaceAddress,
                                functionName: "withdrawProceeds",
                                params: {},
                            },
                            onSuccess: handleWithdrawSuccess,
                            onError: (error) => {
                                console.log(error)
                            },
                        })
                    }}
                    text="Withdraw"
                    type="button"
                    color="green"
                />
            ) : (
                <div>No proceeds to withdraw</div>
            )}
        </div>
    )
}
