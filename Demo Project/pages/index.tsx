import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import Modal from "react-modal";

//ABIs
import FundraiserABI from "../utils/fundraiser.json";
import FundraiserManagerABI from "../utils/fundraisermanager.json";
import USDCABI from "../utils/usdcContract.json";

type Fundraisers = {
  endTime: number;
  fundingamount: string; //check
  organization: string; //address
  fundraiserState: number;
  fundraisertitle: string;
  fundraiserdescription: string;
  fundraiserAddress: string;
  donors: string[]; //list of Donors
};

export default function Home() {
  const originalUsdcContract = "0x0FA8781a83E46826621b3BC094Ea2A0212e71B23"; //usdc token contract address
  const fundraiserManagerContract = "0x76d97911f23f90De9bFD1bD015B978697bc49425";


  // "0x58A849587bbc7ec1Bcf73f9c3b686b11296A09Cd"; //polygon
  // "0xA00240De052e3D4cF50C7564668F683893F3d234"; // goreli   
  // "0x0B6d142F0b21f9D8CDeE22A8e07c51ED2449651f";
  // "0x263E899Bc69d2829C0706cE27FCFcC3F4688c362";
  // "0xd001286e9360d9C123ED2DaDe7AEaDf387728c99";
  // "0x8E1Baad8d4A25e13386426800B5EfEBd0F4d8Fbf";

  //variables
  const [currentWalletAddress, setCurrentWalletAddress] = useState<string>("");
  const [allfundraiserss, setAllfundraisers] = useState<Fundraisers[]>([]);
  const [createfundraiserFields, setfundraiserFields] = useState({
    endTime: 0,
    fundingamount: 0,
    fundraisertitle: "",
    fundraiserdescription: "",
  });

  const [activefundraiser, setfundraiserToActive] = useState<Fundraisers | null>(
    null
  );

  // whether or not to show the loading dialog
  const [isLoading, setIsLoading] = useState(false);

  // text data to display on loading dialog
  const [loadedData, setLoadedData] = useState("Loading...");

  function openModal() {
    setIsLoading(true);
  }

  function closeModal() {
    setIsLoading(false);
  }

  //functions
  async function getAllfundraisers() {
    const { ethereum } = window;

    // Check if MetaMask is installed
    if (!ethereum) {
      return "Make sure you have MetaMask Connected!";
    }

    // Get user Metamask Ethereum wallet address
    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });
    // Get the first account address
    const walletAddr = accounts[0];
    //set to variable to store current wallet address
    setCurrentWalletAddress(walletAddr);

    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      // Create a contract instance of your deployed fundraiser Manager contract
      // 1) add code here
      const fundraiserContractManager = new ethers.Contract(
        fundraiserManagerContract,
        FundraiserManagerABI,
        signer
      );
      // call the getfundraisers function from the contract to get all addresses
      // 2) add code here
      const fundraisersAddresses = await fundraiserContractManager.getfundraisers();

      // call getfundraiserinfo function from contract
      // 3) add code here
      const fundraisers = await fundraiserContractManager.getfundraiserinfo(
        fundraisersAddresses
      );

      // declare new array
      let new_fundraisers = [];

      // loop through array and add it into a new array
      // 4) add code here
      for (let i = 0; i < fundraisers.endTime.length; i++) {
        let endTime: number = fundraisers.endTime[i].toNumber();
        let fundraiserState: number = fundraisers.fundraiserState[i].toNumber();

        let fundingamount = fundraisers.fundingamount[i]; //
        let fundraisertitle: string = fundraisers.fundraisertitle[i];
        let fundraiserdescription: string = fundraisers.fundraiserdescription[i];

        let organizationAddress: string = fundraisers.organization[i];
        console.log(endTime);
        console.log(fundingamount);
        let newfundraiser = {
          endTime: endTime,
          fundingamount: (fundingamount / 1000000).toString(),
          organization: organizationAddress.toLowerCase(),
          fundraiserState: fundraiserState,
          fundraisertitle: fundraisertitle,
          fundraiserdescription: fundraiserdescription,
          fundraiserAddress: fundraisersAddresses[i],
          donors: [],
        };
        new_fundraisers.push(newfundraiser);
      }

      // set to variable
      // 5) add code here
      setAllfundraisers(new_fundraisers);
    }
  }

  async function createfundraiser() {
    try {
      //check if required fields are empty
      if (
        !createfundraiserFields.fundingamount ||
        !createfundraiserFields.endTime ||
        !createfundraiserFields.fundraisertitle ||
        !createfundraiserFields.fundraiserdescription
      ) {
        return alert("Fill all the fields");
      }

      //check if fields meet requirements
      if (createfundraiserFields.fundingamount < 0) {
        return alert("Funding amount must be more than 0");
      }

      if (createfundraiserFields.endTime < 5) {
        return alert("Duration must be more than 5 mins");
      }

      //call create fundraiser function from the contract
      const { ethereum } = window;

      if (ethereum) {
        //set loading modal to open and loading modal text
        setLoadedData("Creating post...Please wait");
        openModal();

        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();

        //create contract instance
        const fundraiserContractManager = new ethers.Contract(
          fundraiserManagerContract,
          FundraiserManagerABI,
          signer
        );

        // call create fundraiser function from the contract
        // 1) add code here
        let { hash } = await fundraiserContractManager.createfundraiser(
          createfundraiserFields.endTime * 60, // Converting minutes to seconds
          ethers.utils.parseUnits(createfundraiserFields.fundingamount.toString(), 6),
          createfundraiserFields.fundraisertitle,
          createfundraiserFields.fundraiserdescription,
          {
            gasLimit: 1200000,
          }
        );

        //wait for transaction to be mined
        // 2) add code here
        await provider.waitForTransaction(hash);

        //close modal
        closeModal();

        //display alert message
        // 3) add code here
        alert(`Transaction sent! Hash: ${hash}`);

        //call getAllfundraisers to refresh the current list
        await getAllfundraisers();

        //reset fields back to default values
        setfundraiserFields({
          endTime: 0,
          fundingamount: 0,
          fundraisertitle: "",
          fundraiserdescription: "",
        });
      }
    } catch (error) {
      console.log(error);
      closeModal();
      alert(`Error: ${error}`);
      return `${error}`;
    }
  }

  async function setActivefundraiser(fundraiser: Fundraisers) {
    const { ethereum } = window;

    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      //create contract instance
      const fundraiserContract = new ethers.Contract(
        fundraiser.fundraiserAddress,
        FundraiserABI,
        signer
      );

      //get all current donors(address)
      let allCurrentdonors = await fundraiserContract.getAllfundraisers();
      // console.log(allCurrentdonors);
      //set current group buy to active and update the donors field
      setfundraiserToActive({
        ...fundraiser,
        donors: allCurrentdonors,
      });
    }
  }

  async function donate(currentActivefundraiser: Fundraisers | null) {
    try {
      const { ethereum } = window;

      if (ethereum) {
        // check if the active fundraisers is null
        if (currentActivefundraiser == null) {
          return;
        }
        //open loading modal and set loading text
        setLoadedData("Getting approval...please wait");
        openModal();

        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();

        // create USDC contract instance
        const usdcContract = new ethers.Contract(
          originalUsdcContract,
          USDCABI,
          signer
        );

        // call approval function to give permission to transfer USDC from user wallet to fundraiser smart contract
        // 1) add code here
        const usdcApprovalTxn = await usdcContract.approve(
          currentActivefundraiser.fundraiserAddress,
          ethers.utils.parseUnits("1000", 6)
        );
        // wait for transaction to be mined
        // 2) add code here
        await usdcApprovalTxn.wait();

        closeModal();

        //after giving approval we will donate here
        setLoadedData("Donating...please wait");
        openModal();

        // create fundraiser contract instance
        const fundraiserContract = new ethers.Contract(
          currentActivefundraiser.fundraiserAddress,
          FundraiserABI,
          signer
        );

        // call dnate function from fundraiser contract
        // 3) add code here
        let { hash } = await fundraiserContract.donate({
          gasLimit: 700000,
        });


        // Wait till the transaction is mined
        // 4) add code here
        await provider.waitForTransaction(hash);

        closeModal();

        // display alert mesaage
        // 5) add code here
        alert(`Transaction sent! Hash: ${hash}`);
        //get updated donors
        //get all current buyers(address) and price(same for all)
        let allCurrentdonors = await fundraiserContract.getAllfundraisers();
        // console.log(allCurrentdonors);
        //set current fundraiser to active
        setfundraiserToActive({
          ...currentActivefundraiser,
          donors: allCurrentdonors,
        });
      }
    } catch (error) {
      closeModal();
      alert(`Error: ${error}`);
      return `${error}`;
    }
  }

  async function withdrawFunds(currentActivefundraiser: Fundraisers | null) {
    try {
      const { ethereum } = window;

      if (ethereum) {
        if (currentActivefundraiser == null) {
          return;
        }

        // open modal and set loading text
        setLoadedData("Withdrawing funds...Please wait");
        openModal();

        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();

        //create fundraiser contract instance
        const fundraiserContract = new ethers.Contract(
          currentActivefundraiser.fundraiserAddress,
          FundraiserABI,
          signer
        );

        //call withdraw funds function from fundraiser contract
        // 1) add code here
        let { hash } = await fundraiserContract.withdrawFunds();

        // Wait till the transaction is mined
        // 2) add code here
        await provider.waitForTransaction(hash);
        setIsLoading(false);
        closeModal();
        // display slert message
        // 3) add code here
        alert(`Transaction sent! Hash: ${hash}`);
      }
    } catch (error) {
      console.log(error);
      closeModal();
      alert(`Error: ${error}`);
      return `${error}`;
    }
  }

  //render functions
  function renderfundraisers(fundraiser: Fundraisers) {
    let state = "";
    if (fundraiser.fundraiserState === 0) {
      state = "Open";
    }
    if (fundraiser.fundraiserState === 1) {
      state = "Ended";
    }

    return (
      <div className={styles.createfundraiserContainer}>
        <p className={styles.paragraphText}>
          Fundraiser Title: {fundraiser.fundraisertitle}
        </p>
        <p className={styles.paragraphText}>
          Fundraiser Description: {fundraiser.fundraiserdescription}
        </p>
        <p className={styles.paragraphText}>
          Funding Amount: {fundraiser.fundingamount || 0} USDC
        </p>
        <p className={styles.paragraphText}>
          Organization Address: {fundraiser.organization}
        </p>{" "}
        {(() => {
          if (fundraiser.fundraiserState === 0) {
            return (
              <p className={styles.paragraphText}>
                Ending in :{" "}
                {Math.round((fundraiser.endTime * 1000 - Date.now()) / 1000 / 60)}{" "}
                {/* Time left in minutes */}
                minutes
              </p>
            );
          }
        })()}
        <p className={styles.paragraphText}>Fundraiser State: {state}</p>
        <button
          className={styles.seeMoreBtn}
          onClick={() => {
            setActivefundraiser(fundraiser);
          }}
        >
          See More
        </button>
      </div>
    );
  }

  function renderSpecificfundraiser(
    fundraiser: Fundraisers,
    currentUserWalletAddress: string
  ) {
    let state = "";
    if (fundraiser.fundraiserState === 0) {
      state = "Open";
    }
    if (fundraiser.fundraiserState === 1) {
      state = "Ended";
    }

    let isOwner = fundraiser.organization === currentUserWalletAddress;

    let isfundraiserOpen = state === "Open"; // Check if the fundraisser is still open
    let hasfundraiserEnded = state === "Ended"; // Check if the fundraiser has ended

    let isCurrentUserAdonor = fundraiser.donors.some(
      (donor) => donor.toLowerCase() === currentUserWalletAddress
    );

    return (
      <div className={styles.activefundraiserContainer}>
        <div>
          <div>
            <p className={styles.paragraphText}>
              Fundraiser Title: {fundraiser.fundraisertitle || 0}{" "}
            </p>
            <p className={styles.paragraphText}>
              FUndraiser Description: {fundraiser.fundraiserdescription || 0}{" "}
            </p>
            <p className={styles.paragraphText}>Funding Amount: {fundraiser.fundingamount} USDC</p>{" "}
            {/* Starting price */}
            <p className={styles.paragraphText}>
              Organization: {fundraiser.organization}
            </p>{" "}
            <div style={{ display: "flex" }}>
              <p className={styles.paragraphText}>
                Fundraiser Smart Contract Address:{" "}
              </p>
              <p className={styles.hyperlinkText}>
                <Link
                  href={`https://goerli.etherscan.io/address/${fundraiser.fundraiserAddress}`}
                  target="_blank"
                >
                  {fundraiser.fundraiserAddress}
                </Link>
              </p>
            </div>
            {(() => {
              if (fundraiser.fundraiserState === 0) {
                return (
                  <p className={styles.paragraphText}>
                    Ending in :{" "}
                    {Math.round(
                      (fundraiser.endTime * 1000 - Date.now()) / 1000 / 60
                    )}{" "}
                    {/* Time left in minutes */}
                    minutes
                  </p>
                );
              }
            })()}
            <p className={styles.paragraphText}>Fundraiser State: {state}</p>
          </div>
          <div>
            <h3 style={{ padding: "10px" }}>List of all Donors</h3>
            <table>
              <thead>
                <tr>
                  <th
                    style={{
                      borderColor: "black",
                      borderStyle: "groove",
                      padding: "10px",
                    }}
                  >
                    Donors
                  </th>
                  <th
                    style={{
                      borderColor: "black",
                      borderStyle: "groove",
                      padding: "10px",
                    }}
                  >
                    funding amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {fundraiser.donors.map((donor) => {
                  return (
                    <tr key={donor}>
                      <td
                        style={{
                          borderColor: "black",
                          borderStyle: "groove",
                          padding: "10px",
                        }}
                      >
                        {donor.toLowerCase()}
                      </td>
                      <td
                        style={{
                          borderColor: "black",
                          borderStyle: "groove",
                          padding: "10px",
                        }}
                      >
                        {fundraiser.fundingamount} USDC
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div>
            {isfundraiserOpen && !isOwner && !isCurrentUserAdonor ? (
              <div>
                <button
                  className={styles.donateBtn}
                  onClick={() => donate(activefundraiser)}
                >
                  Donate
                </button>
              </div>
            ) : null}
            <button
              className={styles.backBtn}
              onClick={() => setfundraiserToActive(null)}
            >
              Go Back
            </button>
            {isOwner && //only organization can withdraw funds
              hasfundraiserEnded && //can only withdraw after fundraisesr ends
              activefundraiser != null &&
              activefundraiser.donors.length > 0 ? ( //withdraw if there are donors
              <button
                className={styles.withdrawFundsBtn}
                onClick={() => withdrawFunds(activefundraiser)}
              >
                Withdraw Funds
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      color: "black ",
    },
  };

  useEffect(() => {
    getAllfundraisers();
  }, []);

  return (
    <>
      <Head>
        <title>Fundraising APP</title>

        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* <link rel="icon" href="/buy.png" /> */}
      </Head>

      <div
        style={{
          backgroundColor: "white",
          minWidth: "500px",
          paddingBottom: "10px",
        }}
      >
        <div className={styles.topPanel}>
          <div className={styles.walletAddress}>{`Fundraising Web App`}</div>
          <div className={styles.walletAddress}>
            {`Wallet Address: ${currentWalletAddress}`}
          </div>
        </div>


        <div className={styles.body}>
          <div className={styles.container}>
            <Head>
              <title>Fundraising with Blockchain</title>
              <meta name="description" content="Fundraising website using blockchain technology" />
              <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
              <h1 className={styles.title}>
                Welcome to Fundraising with <a href="https://ethereum.org/">Blockchain!</a>
              </h1>

              <p className={styles.description}>
                We're raising funds using blockchain technology to ensure transparency and accountability.
              </p>

              <div className={styles.grid}>
                <a href="#allfunds" className={styles.card}>
                  <h2>Donate Now &rarr;</h2>
                  <p>Contribute to our cause and make a difference in the world.</p>
                </a>



                <a href="#createfund" className={styles.card}>
                  <h2>Raise Funds &rarr;</h2>
                  <p>Raise funds for good deed,
                    We are here to help you !!</p>
                </a>
              </div>
            </main>

          </div>
        </div>

        <Modal
          isOpen={isLoading}
          //onRequestClose={closeModal}
          style={customStyles}
          contentLabel="Example Modal"
        >
          {loadedData}
        </Modal>

        <h2 className={styles.allfundraiser}>
          {(() => {
            if (activefundraiser == null) {
              return <div id="allfunds">{`All Fundraising posts`}</div>;
            } else {
              return <div>{`Fundraising Title`}</div>;
            }
          })()}
        </h2>


        <div>
          {activefundraiser != null ? (
            renderSpecificfundraiser(activefundraiser, currentWalletAddress)
          ) : (
            <div>
              {allfundraiserss.map((fundraiser) => renderfundraisers(fundraiser))}
            </div>
          )}
        </div>



        <div className={styles.createfundraiserContainer} id="createfund">
          <h2 className={styles.createfundraiserText}>Create Fundraising Post</h2>

          <div style={{ margin: "20px" }}>
            <label>Fundraising Title</label>
            <input
              type="text"
              placeholder="Enter title for your fundraiser"
              onChange={(e) =>
                setfundraiserFields({
                  ...createfundraiserFields,
                  fundraisertitle: e.target.value,
                })
              }
              value={createfundraiserFields.fundraisertitle}
              style={{
                padding: "15px",
                textAlign: "center",
                display: "block",
                width: "400px",
                backgroundColor: "pink",
                color: "black",
              }}
            />
          </div>

          <div style={{ margin: "20px" }}>
            <label>Fundraising Description</label>
            <input
              type="text"
              placeholder="Enter Fundraiser details"
              onChange={(e) =>
                setfundraiserFields({
                  ...createfundraiserFields,
                  fundraiserdescription: e.target.value,
                })
              }
              value={createfundraiserFields.fundraiserdescription}
              style={{
                padding: "15px",
                textAlign: "center",
                display: "block",
                width: "400px",
                backgroundColor: "pink",
                color: "black",
              }}
            />
          </div>

          <div style={{ margin: "20px" }}>
            <label>Enter Donation Amount(USDC)</label>
            <input
              type="number"
              placeholder="Donation Amount per person"
              onChange={(e) =>
                setfundraiserFields({
                  ...createfundraiserFields,
                  fundingamount: parseFloat(e.target.value),
                })
              }
              value={createfundraiserFields.fundingamount}
              style={{
                padding: "15px",
                textAlign: "center",
                display: "block",
                backgroundColor: "pink",
                color: "black",
                width: "400px",
              }}
            />
          </div>

          <div style={{ margin: "20px" }}>
            <label>Duration in Mins</label>
            <input
              type="number"
              placeholder="End Time(mins)"
              onChange={(e) =>
                setfundraiserFields({
                  ...createfundraiserFields,
                  endTime: parseInt(e.target.value),
                })
              }
              value={createfundraiserFields.endTime}
              style={{
                padding: "15px",
                textAlign: "center",
                display: "block",
                backgroundColor: "pink",
                color: "black",
                width: "400px",
              }}
            />
          </div>

          <button
            type="button"
            className={styles.createfundraiserBtn}
            onClick={() => createfundraiser()}
          >
            Create Post
          </button>
        </div>
      </div>
      <img src="/Fundraising.jpg" />
    </>
  );
}
