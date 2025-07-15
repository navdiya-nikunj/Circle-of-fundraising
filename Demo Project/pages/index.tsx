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
  fundingamount: string;
  organization: string;
  fundraiserState: number;
  fundraisertitle: string;
  fundraiserdescription: string;
  fundraiserAddress: string;
  donors: string[];
};

type CurrentPage = 'home' | 'view-campaigns' | 'start-campaign' | 'campaign-details';

export default function Home() {
  const originalUsdcContract = process.env.NEXT_PUBLIC_USDC_CONTRACT || "";
  const fundraiserManagerContract = process.env.NEXT_PUBLIC_FUNDRAISER_MANAGER_CONTRACT || "";

  // State management
  const [currentPage, setCurrentPage] = useState<CurrentPage>('home');
  const [currentWalletAddress, setCurrentWalletAddress] = useState<string>("");
  const [allfundraiserss, setAllfundraisers] = useState<Fundraisers[]>([]);
  const [activefundraiser, setActivefundraiser] = useState<Fundraisers | null>(null);
  const [createfundraiserFields, setfundraiserFields] = useState({
    endTime: 0,
    fundingamount: 0,
    fundraisertitle: "",
    fundraiserdescription: "",
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadedData, setLoadedData] = useState("Loading...");

  function openModal() {
    setIsLoading(true);
  }

  function closeModal() {
    setIsLoading(false);
  }

  // Navigation functions
  const navigateToHome = () => {
    setCurrentPage('home');
    setActivefundraiser(null);
  };

  const navigateToViewCampaigns = () => {
    setCurrentPage('view-campaigns');
    setActivefundraiser(null);
  };

  const navigateToStartCampaign = () => {
    setCurrentPage('start-campaign');
    setActivefundraiser(null);
  };

  const navigateToCampaignDetails = (fundraiser: Fundraisers) => {
    setActivefundraiser(fundraiser);
    setCurrentPage('campaign-details');
    setActivefundraiserData(fundraiser);
  };

  // Blockchain functions
  async function getAllfundraisers() {
    const { ethereum } = window;

    if (!ethereum) {
      return "Make sure you have MetaMask Connected!";
    }

    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });
    const walletAddr = accounts[0];
    setCurrentWalletAddress(walletAddr);

    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      const fundraiserContractManager = new ethers.Contract(
        fundraiserManagerContract,
        FundraiserManagerABI,
        signer
      );
      
      const fundraisersAddresses = await fundraiserContractManager.getfundraisers();
      const fundraisers = await fundraiserContractManager.getfundraiserinfo(fundraisersAddresses);

      let new_fundraisers = [];

      for (let i = 0; i < fundraisers.endTime.length; i++) {
        let endTime: number = fundraisers.endTime[i].toNumber();
        let fundraiserState: number = fundraisers.fundraiserState[i].toNumber();
        let fundingamount = fundraisers.fundingamount[i];
        let fundraisertitle: string = fundraisers.fundraisertitle[i];
        let fundraiserdescription: string = fundraisers.fundraiserdescription[i];
        let organizationAddress: string = fundraisers.organization[i];

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

      setAllfundraisers(new_fundraisers);
    }
  }

  async function createfundraiser() {
    try {
      if (
        !createfundraiserFields.fundingamount ||
        !createfundraiserFields.endTime ||
        !createfundraiserFields.fundraisertitle ||
        !createfundraiserFields.fundraiserdescription
      ) {
        return alert("Fill all the fields");
      }

      if (createfundraiserFields.fundingamount < 0) {
        return alert("Funding amount must be more than 0");
      }

      if (createfundraiserFields.endTime < 5) {
        return alert("Duration must be more than 5 mins");
      }

      const { ethereum } = window;

      if (ethereum) {
        setLoadedData("Creating campaign...Please wait");
        openModal();

        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();

        const fundraiserContractManager = new ethers.Contract(
          fundraiserManagerContract,
          FundraiserManagerABI,
          signer
        );

        let { hash } = await fundraiserContractManager.createfundraiser(
          createfundraiserFields.endTime * 60,
          ethers.utils.parseUnits(createfundraiserFields.fundingamount.toString(), 6),
          createfundraiserFields.fundraisertitle,
          createfundraiserFields.fundraiserdescription,
          {
            gasLimit: 1200000,
          }
        );

        await provider.waitForTransaction(hash);
        closeModal();
        alert(`Campaign created successfully! Hash: ${hash}`);

        await getAllfundraisers();
        setfundraiserFields({
          endTime: 0,
          fundingamount: 0,
          fundraisertitle: "",
          fundraiserdescription: "",
        });

        // Navigate to view campaigns
        setCurrentPage('view-campaigns');
      }
    } catch (error) {
      console.log(error);
      closeModal();
      alert(`Error: ${error}`);
      return `${error}`;
    }
  }

  async function setActivefundraiserData(fundraiser: Fundraisers) {
    const { ethereum } = window;

    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      const fundraiserContract = new ethers.Contract(
        fundraiser.fundraiserAddress,
        FundraiserABI,
        signer
      );

      let allCurrentdonors = await fundraiserContract.getAllfundraisers();
      setActivefundraiser({
        ...fundraiser,
        donors: allCurrentdonors,
      });
    }
  }

  async function donate(currentActivefundraiser: Fundraisers | null) {
    try {
      const { ethereum } = window;

      if (ethereum) {
        if (currentActivefundraiser == null) {
          return;
        }
        
        setLoadedData("Getting approval...please wait");
        openModal();

        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();

        const usdcContract = new ethers.Contract(
          originalUsdcContract,
          USDCABI,
          signer
        );

        const usdcApprovalTxn = await usdcContract.approve(
          currentActivefundraiser.fundraiserAddress,
          ethers.utils.parseUnits("1000", 6)
        );
        await usdcApprovalTxn.wait();

        closeModal();

        setLoadedData("Donating...please wait");
        openModal();

        const fundraiserContract = new ethers.Contract(
          currentActivefundraiser.fundraiserAddress,
          FundraiserABI,
          signer
        );

        let { hash } = await fundraiserContract.donate({
          gasLimit: 700000,
        });

        await provider.waitForTransaction(hash);
        closeModal();

        alert(`Donation successful! Hash: ${hash}`);
        
        let allCurrentdonors = await fundraiserContract.getAllfundraisers();
        setActivefundraiser({
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

        setLoadedData("Withdrawing funds...Please wait");
        openModal();

        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();

        const fundraiserContract = new ethers.Contract(
          currentActivefundraiser.fundraiserAddress,
          FundraiserABI,
          signer
        );

        let { hash } = await fundraiserContract.withdrawFunds();
        await provider.waitForTransaction(hash);
        
        closeModal();
        alert(`Funds withdrawn successfully! Hash: ${hash}`);
      }
    } catch (error) {
      console.log(error);
      closeModal();
      alert(`Error: ${error}`);
      return `${error}`;
    }
  }

  // Render functions
  function renderFundraiserCard(fundraiser: Fundraisers) {
    let state = "";
    if (fundraiser.fundraiserState === 0) {
      state = "Open";
    }
    if (fundraiser.fundraiserState === 1) {
      state = "Ended";
    }

    const timeLeft = Math.round((fundraiser.endTime * 1000 - Date.now()) / 1000 / 60);

    return (
      <div 
        key={fundraiser.fundraiserAddress}
        className={styles.fundraiserCard}
        onClick={() => navigateToCampaignDetails(fundraiser)}
      >
        <h3 className={styles.fundraiserTitle}>{fundraiser.fundraisertitle}</h3>
        <p className={styles.fundraiserDescription}>{fundraiser.fundraiserdescription}</p>
        
        <div className={styles.fundraiserMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Funding Amount</span>
            <span className={styles.metaValue}>{fundraiser.fundingamount || 0} USDC</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Status</span>
            <span className={`${styles.statusBadge} ${fundraiser.fundraiserState === 0 ? styles.statusOpen : styles.statusEnded}`}>
              {state}
            </span>
          </div>
          {fundraiser.fundraiserState === 0 && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Time Remaining</span>
              <span className={styles.metaValue}>{timeLeft > 0 ? `${timeLeft} minutes` : 'Ended'}</span>
            </div>
          )}
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Organization</span>
            <span className={styles.metaValue} title={fundraiser.organization}>
              {fundraiser.organization.substring(0, 10)}...
            </span>
          </div>
        </div>
      </div>
    );
  }

  function renderCampaignDetails() {
    if (!activefundraiser) return null;

    let state = "";
    if (activefundraiser.fundraiserState === 0) {
      state = "Open";
    }
    if (activefundraiser.fundraiserState === 1) {
      state = "Ended";
    }

    let isOwner = activefundraiser.organization === currentWalletAddress;
    let isfundraiserOpen = state === "Open";
    let hasfundraiserEnded = state === "Ended";

    let isCurrentUserAdonor = activefundraiser.donors.some(
      (donor) => donor.toLowerCase() === currentWalletAddress
    );

    const timeLeft = Math.round((activefundraiser.endTime * 1000 - Date.now()) / 1000 / 60);

    return (
      <div className={styles.detailCard}>
        <div className={styles.detailHeader}>
          <h2 className={styles.detailTitle}>{activefundraiser.fundraisertitle}</h2>
          <p className={styles.detailDescription}>{activefundraiser.fundraiserdescription}</p>
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Funding Amount</span>
            <span className={styles.metaValue}>{activefundraiser.fundingamount} USDC</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Organization</span>
            <span className={styles.metaValue} title={activefundraiser.organization}>
              {activefundraiser.organization}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Status</span>
            <span className={`${styles.statusBadge} ${activefundraiser.fundraiserState === 0 ? styles.statusOpen : styles.statusEnded}`}>
              {state}
            </span>
          </div>
          {activefundraiser.fundraiserState === 0 && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Time Remaining</span>
              <span className={styles.metaValue}>{timeLeft > 0 ? `${timeLeft} minutes` : 'Ended'}</span>
            </div>
          )}
          <div className={styles.metaItem} style={{ gridColumn: '1 / -1' }}>
            <span className={styles.metaLabel}>Smart Contract Address</span>
            <Link
              href={`https://goerli.etherscan.io/address/${activefundraiser.fundraiserAddress}`}
              target="_blank"
              className={styles.contractLink}
            >
              {activefundraiser.fundraiserAddress}
            </Link>
          </div>
        </div>

        {activefundraiser.donors.length > 0 && (
          <div className={styles.donorsSection}>
            <h3 className={styles.donorsTitle}>Donors ({activefundraiser.donors.length})</h3>
            <table className={styles.donorsTable}>
              <thead>
                <tr>
                  <th>Donor Address</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {activefundraiser.donors.map((donor, index) => (
                  <tr key={index}>
                    <td>{donor.toLowerCase()}</td>
                    <td>{activefundraiser.fundingamount} USDC</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.actionButtons}>
          {isfundraiserOpen && !isOwner && !isCurrentUserAdonor && (
            <button
              className={styles.btnSuccess}
              onClick={() => donate(activefundraiser)}
            >
              💝 Donate Now
            </button>
          )}
          
          <button
            className={styles.btnSecondary}
            onClick={navigateToViewCampaigns}
          >
            ← Back to Campaigns
          </button>
          
          {isOwner &&
            hasfundraiserEnded &&
            activefundraiser != null &&
            activefundraiser.donors.length > 0 && (
            <button
              className={styles.btnDanger}
              onClick={() => withdrawFunds(activefundraiser)}
            >
              💰 Withdraw Funds
            </button>
          )}
        </div>
      </div>
    );
  }

  // Landing Page Components
  function renderHeroSection() {
    return (
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                The Future of Transparent Fundraising is Here
              </h1>
              <p className={styles.heroSubtitle}>
                Launch and support fundraising campaigns with complete transparency, 
                built on blockchain technology. Every donation is tracked, every goal is verified, 
                and every impact is measurable.
              </p>
              <div className={styles.heroCTA}>
                <button 
                  className={styles.btnHeroPrimary}
                  onClick={navigateToViewCampaigns}
                >
                  🔍 Explore Campaigns
                </button>
                <button 
                  className={styles.btnHeroSecondary}
                  onClick={navigateToStartCampaign}
                >
                  🚀 Start Fundraising
                </button>
              </div>
            </div>
            
            <div className={styles.heroVisual}>
              <div className={styles.heroCard}>
                <h3>🎯 Campaign Example</h3>
                <p>Clean Water for Communities</p>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                  25 USDC per donation • 150 supporters • Fully funded
                </p>
              </div>
            </div>
          </div>
          
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatNumber}>₴2.5M+</div>
              <div className={styles.heroStatLabel}>Total Raised</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatNumber}>10K+</div>
              <div className={styles.heroStatLabel}>Campaigns Funded</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatNumber}>50K+</div>
              <div className={styles.heroStatLabel}>Global Supporters</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderFeaturesSection() {
    return (
      <section className={styles.featuresSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Why Choose FundChain?</h2>
          <p className={styles.sectionSubtitle}>
            Built on blockchain technology to ensure every donation makes a real impact
          </p>
          
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🔒</span>
              <h3 className={styles.featureTitle}>100% Transparent</h3>
              <p className={styles.featureDescription}>
                Every transaction is recorded on the blockchain. Track exactly where your donations go 
                and see real-time progress on all campaigns.
              </p>
            </div>
            
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>⚡</span>
              <h3 className={styles.featureTitle}>Instant Global Access</h3>
              <p className={styles.featureDescription}>
                Support causes worldwide with USDC cryptocurrency. No bank delays, 
                no exchange fees, no borders limiting your generosity.
              </p>
            </div>
            
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🛡️</span>
              <h3 className={styles.featureTitle}>Smart Contract Security</h3>
              <p className={styles.featureDescription}>
                Funds are secured by smart contracts. Automatic release only when goals are met, 
                with built-in protection against fraud.
              </p>
            </div>
            
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>📊</span>
              <h3 className={styles.featureTitle}>Real-Time Analytics</h3>
              <p className={styles.featureDescription}>
                Monitor campaign performance with live updates. See donor lists, 
                funding progress, and impact metrics in real-time.
              </p>
            </div>
            
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🌍</span>
              <h3 className={styles.featureTitle}>Global Community</h3>
              <p className={styles.featureDescription}>
                Join a worldwide network of changemakers. Connect with like-minded individuals 
                and organizations making a difference.
              </p>
            </div>
            
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>💎</span>
              <h3 className={styles.featureTitle}>Low Fees</h3>
              <p className={styles.featureDescription}>
                Minimal platform fees mean more of your donation reaches the cause you care about. 
                Maximum impact, minimal overhead.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderHowItWorksSection() {
    return (
      <section className={styles.howItWorksSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>How FundChain Works</h2>
          <p className={styles.sectionSubtitle}>
            Simple steps to transparent fundraising and giving
          </p>
          
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <h3 className={styles.stepTitle}>Connect Your Wallet</h3>
              <p className={styles.stepDescription}>
                Link your MetaMask wallet to get started. Your wallet is your secure gateway 
                to the blockchain and ensures complete ownership of your funds.
              </p>
            </div>
            
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <h3 className={styles.stepTitle}>Create or Browse</h3>
              <p className={styles.stepDescription}>
                Launch your own fundraising campaign or explore existing causes. 
                Set clear goals, timelines, and impact metrics for maximum transparency.
              </p>
            </div>
            
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <h3 className={styles.stepTitle}>Donate with USDC</h3>
              <p className={styles.stepDescription}>
                Support campaigns using USDC stablecoin for consistent value. 
                All transactions are instant, secure, and permanently recorded.
              </p>
            </div>
            
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>4</div>
              <h3 className={styles.stepTitle}>Track Impact</h3>
              <p className={styles.stepDescription}>
                Monitor progress in real-time through our transparent dashboard. 
                See exactly how funds are used and the impact being made.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderStatsSection() {
    return (
      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>$2.5M+</div>
              <div className={styles.statLabel}>Successfully Raised</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>10,247</div>
              <div className={styles.statLabel}>Campaigns Completed</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>50K+</div>
              <div className={styles.statLabel}>Active Supporters</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>98%</div>
              <div className={styles.statLabel}>Funding Success Rate</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderCTASection() {
    return (
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>Ready to Make a Difference?</h2>
          <p className={styles.ctaDescription}>
            Join thousands of changemakers using blockchain technology to create transparent, 
            impactful fundraising campaigns. Start supporting causes you care about today.
          </p>
          
          <div className={styles.ctaButtons}>
            <button 
              className={styles.btnPrimary}
              onClick={navigateToStartCampaign}
            >
              🚀 Start Your Campaign
            </button>
            <button 
              className={styles.btnSecondary}
              onClick={navigateToViewCampaigns}
            >
              🔍 Browse Campaigns
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Page content rendering
  function renderPageContent() {
    switch (currentPage) {
      case 'home':
        return (
          <>
            {renderHeroSection()}
            {renderFeaturesSection()}
            {renderHowItWorksSection()}
            {renderStatsSection()}
            {renderCTASection()}
          </>
        );

      case 'view-campaigns':
        return (
          <>
            <div className={styles.pageHeader}>
              <div className={styles.container}>
                <h1 className={styles.pageTitle}>Active Fundraising Campaigns</h1>
                <p className={styles.pageDescription}>
                  Browse and support transparent fundraising campaigns powered by blockchain technology.
                </p>
              </div>
            </div>
            
            <div className={styles.container}>
              <div className={styles.content}>
                {allfundraiserss.length > 0 ? (
                  <div className={styles.fundraisersGrid}>
                    {allfundraiserss.map((fundraiser) => renderFundraiserCard(fundraiser))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>📋</div>
                    <h3 className={styles.emptyStateTitle}>No Active Campaigns</h3>
                    <p className={styles.emptyStateDescription}>
                      There are no fundraising campaigns at the moment. Be the first to create one!
                    </p>
                    <button
                      className={styles.btnPrimary}
                      onClick={navigateToStartCampaign}
                    >
                      🚀 Start Your First Campaign
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        );

      case 'start-campaign':
        return (
          <>
            <div className={styles.pageHeader}>
              <div className={styles.container}>
                <div className={styles.breadcrumb}>
                  <span className={styles.breadcrumbLink} onClick={navigateToHome}>Home</span>
                  <span className={styles.breadcrumbSeparator}>›</span>
                  <span className={styles.breadcrumbCurrent}>Start Campaign</span>
                </div>
                <h1 className={styles.pageTitle}>Start Your Fundraising Campaign</h1>
                <p className={styles.pageDescription}>
                  Create a transparent, blockchain-powered fundraising campaign and reach supporters worldwide.
                </p>
              </div>
            </div>
            
            <div className={styles.container}>
              <div className={styles.content}>
                <form className={styles.createForm} onSubmit={(e) => e.preventDefault()}>
                  <h3 className={styles.formTitle}>Campaign Details</h3>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Campaign Title</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Enter a compelling title for your fundraiser"
                      onChange={(e) =>
                        setfundraiserFields({
                          ...createfundraiserFields,
                          fundraisertitle: e.target.value,
                        })
                      }
                      value={createfundraiserFields.fundraisertitle}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Campaign Description</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Describe your fundraising campaign and its purpose"
                      onChange={(e) =>
                        setfundraiserFields({
                          ...createfundraiserFields,
                          fundraiserdescription: e.target.value,
                        })
                      }
                      value={createfundraiserFields.fundraiserdescription}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Donation Amount per Person (USDC)</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        setfundraiserFields({
                          ...createfundraiserFields,
                          fundingamount: parseFloat(e.target.value),
                        })
                      }
                      value={createfundraiserFields.fundingamount || ''}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Campaign Duration (Minutes)</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="60"
                      min="5"
                      onChange={(e) =>
                        setfundraiserFields({
                          ...createfundraiserFields,
                          endTime: parseInt(e.target.value),
                        })
                      }
                      value={createfundraiserFields.endTime || ''}
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => createfundraiser()}
                    style={{ width: '100%' }}
                  >
                    🚀 Launch Campaign
                  </button>
                </form>
              </div>
            </div>
          </>
        );

      case 'campaign-details':
        return (
          <>
            <div className={styles.pageHeader}>
              <div className={styles.container}>
                <div className={styles.breadcrumb}>
                  <span className={styles.breadcrumbLink} onClick={navigateToHome}>Home</span>
                  <span className={styles.breadcrumbSeparator}>›</span>
                  <span className={styles.breadcrumbLink} onClick={navigateToViewCampaigns}>Campaigns</span>
                  <span className={styles.breadcrumbSeparator}>›</span>
                  <span className={styles.breadcrumbCurrent}>Campaign Details</span>
                </div>
                <h1 className={styles.pageTitle}>Campaign Details</h1>
                <p className={styles.pageDescription}>
                  View complete information about this fundraising campaign.
                </p>
              </div>
            </div>
            
            <div className={styles.container}>
              <div className={styles.content}>
                {renderCampaignDetails()}
              </div>
            </div>
          </>
        );

      default:
        navigateToHome();
        return null;
    }
  }

  // Footer component
  function renderFooter() {
    return (
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h3>FundChain</h3>
            <p>
              Transparent fundraising powered by blockchain technology. 
              Create and support campaigns with complete accountability.
            </p>
          </div>
          <div className={styles.footerSection}>
            <h3>Platform</h3>
            <ul>
              <li><a href="#" onClick={navigateToViewCampaigns}>View Campaigns</a></li>
              <li><a href="#" onClick={navigateToStartCampaign}>Start Campaign</a></li>
              <li><a href="#">How it Works</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>
          <div className={styles.footerSection}>
            <h3>Technology</h3>
            <ul>
              <li><a href="https://ethereum.org/" target="_blank">Ethereum</a></li>
              <li><a href="https://www.centre.io/usdc" target="_blank">USDC</a></li>
              <li><a href="#">Smart Contracts</a></li>
              <li><a href="#">Security</a></li>
            </ul>
          </div>
          <div className={styles.footerSection}>
            <h3>Support</h3>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; 2024 FundChain. All rights reserved. Built with blockchain technology for transparency.</p>
        </div>
      </footer>
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
        <title>FundChain - Blockchain Fundraising Platform</title>
        <meta name="description" content="Transparent fundraising powered by blockchain technology" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        {/* Navigation Bar */}
        <nav className={styles.navbar}>
          <div className={styles.navContent}>
            <div className={styles.logo} onClick={navigateToHome}>
              FundChain
            </div>
            
            <div className={styles.navMenu}>
              <button
                className={`${styles.navItem} ${currentPage === 'home' ? styles.navItemActive : ''}`}
                onClick={navigateToHome}
              >
                Home
              </button>
              <button
                className={`${styles.navItem} ${currentPage === 'view-campaigns' ? styles.navItemActive : ''}`}
                onClick={navigateToViewCampaigns}
              >
                View Campaigns
              </button>
              <button
                className={`${styles.navItem} ${currentPage === 'start-campaign' ? styles.navItemActive : ''}`}
                onClick={navigateToStartCampaign}
              >
                Start Campaign
              </button>
            </div>

            <div className={styles.walletInfo}>
              <div className={styles.walletAddress}>
                {currentWalletAddress ? 
                  `${currentWalletAddress.substring(0, 6)}...${currentWalletAddress.substring(38)}` : 
                  'Connect Wallet'
                }
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        {renderPageContent()}

        {/* Footer */}
        {renderFooter()}

        {/* Loading Modal */}
        <Modal
          isOpen={isLoading}
          style={customStyles}
          contentLabel="Transaction Loading"
        >
          <div className={styles.modalContent}>
            <div>⏳</div>
            <span className={styles.modalText}>{loadedData}</span>
          </div>
        </Modal>
      </div>
    </>
  );
}
