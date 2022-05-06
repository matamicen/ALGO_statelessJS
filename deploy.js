const algosdk = require('algosdk');

//

const keypress = async () => {
    process.stdin.setRawMode(true)
    return new Promise(resolve => process.stdin.once('data', () => {
        process.stdin.setRawMode(false)
        resolve()
    })) 
}

/**
 * Wait until the transaction is confirmed or rejected, or until 'timeout'
 * number of rounds have passed.
 * @param {algosdk.Algodv2} algodClient the Algod V2 client
 * @param {string} txId the transaction ID to wait for
 * @param {number} timeout maximum number of rounds to wait
 * @return {Promise<*>} pending transaction information
 * @throws Throws an error if the transaction is not confirmed or rejected in the next timeout rounds
 */
 const waitForConfirmation = async function (algodClient, txId, timeout) {
    if (algodClient == null || txId == null || timeout < 0) {
        throw new Error("Bad arguments");
    }

    const status = (await algodClient.status().do());
    if (status === undefined) {
        throw new Error("Unable to get node status");
    }

    const startround = status["last-round"] + 1;
    let currentround = startround;

    while (currentround < (startround + timeout)) {
        const pendingInfo = await algodClient.pendingTransactionInformation(txId).do();
        if (pendingInfo !== undefined) {
            if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
                //Got the completed Transaction
                return pendingInfo;
            } else {
                if (pendingInfo["pool-error"] != null && pendingInfo["pool-error"].length > 0) {
                    // If there was a pool error, then the transaction has been rejected!
                    throw new Error("Transaction " + txId + " rejected - pool error: " + pendingInfo["pool-error"]);
                }
            }
        }
        await algodClient.statusAfterBlock(currentround).do();
        currentround++;
    }
    throw new Error("Transaction " + txId + " not confirmed after " + timeout + " rounds!");
};


const createAccount =  function (){
    try{  
        const myaccount = algosdk.generateAccount();
        console.log("Account Address = " + myaccount.addr);
        let account_mnemonic = algosdk.secretKeyToMnemonic(myaccount.sk);
        console.log("Account Mnemonic = "+ account_mnemonic);
        console.log("Account created. Save off Mnemonic and address");
        console.log("Add funds to account using the TestNet Dispenser: ");
        console.log("https://dispenser.testnet.aws.algodev.network/ ");
        return myaccount;
    }
    catch (err) {
        console.log("err", err);
    }
};

  // compile stateless delegate contract
  async function compileProgram(client, programSource) {
    let encoder = new TextEncoder();
    let programBytes = encoder.encode(programSource);
    let compileResponse = await client.compile(programBytes).do();
    return compileResponse;
  }


async function firstTransaction() {

let logicsig = `#pragma version 5
txn CloseRemainderTo
global ZeroAddress
==
txn RekeyTo
global ZeroAddress
==
&&
txn Fee
int 1000
<=
&&
return
`;

    try {
        // let myAccount = createAccount();
        // console.log(myAccount)
        account1 = algosdk.mnemonicToSecretKey("walk famous track use near trend kid cactus brief arm online height dance upset behind ozone achieve arrow same ten dragon stay donor absorb fox")
        //  let signedTxn = txn.signTxn(account2.sk);
        console.log(account1)
        
        console.log("Press any key when the account is funded");
        await keypress();
        // Connect your client
        // const algodToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        // const algodServer = 'http://localhost';
        // const algodPort = 4001;
        const algodToken = '';
        const algodServer = "https://node.testnet.algoexplorerapi.io"
        const algoIndexer = "https://algoindexer.testnet.algoexplorerapi.io/"
        // const algoIndexer = "https://algoindexer.algoexplorerapi.io/"
        const algodPort = '';

        let indexer = new algosdk.Indexer(algodToken, algoIndexer,algodPort);
        
        let algodClient = new algosdk.Algodv2(algodToken, algodServer,algodPort);

        let accountInfo = await indexer.lookupAccountByID("TQULBUDS5FU3FOTYONILPWKEOUV4GGHXQ2X2RJMCJI2NZ6P6R64KB3RRCE").do()

        console.log("Information for Account: " + JSON.stringify(accountInfo, undefined, 2));

        
         // Construct the transaction
         let params = await algodClient.getTransactionParams().do();
         console.log("llega aca?")
         // comment out the next two lines to use suggested fee
         params.fee = 1000;
         params.flatFee = true;

         const enc = new TextEncoder();
         const note = enc.encode("Hello Matias!");
         amount = 1000000;
 
         // Account1
         sender = "LR4PLJS7KIV7V56N7VENMRBGZOJXMBGPS33TK2QRHBE7VXPRSZWZEUD6C4";
       
         // Logicsig Account
         // sender = "JPKHPHVRRVTLGXP7DOK3UR7YXMFN3KUABJFLGTLPI4J76HNHZHYP5ORLEI"
      
         receiver = "TQULBUDS5FU3FOTYONILPWKEOUV4GGHXQ2X2RJMCJI2NZ6P6R64KB3RRCE"
      
         let txn1 = algosdk.makePaymentTxnWithSuggestedParams(sender, receiver, amount, undefined, note, params);
        //  let txId = txn1.txID().toString();
        //  console.log("Signed transaction with txID: %s", txId);

        // build the logicsig
         compilation = await compileProgram(algodClient, logicsig);
         logicsigProgram = Buffer.from(compilation.result, "base64");
         program_array = new Uint8Array (logicsigProgram);
         args = null;
         lsig = new algosdk.LogicSigAccount(program_array, args);
         console.log('logicsic_account: '+lsig.address())
         lsig.sign(account1.sk) // Logicsig delegates to account1
     
         const stxn = algosdk.signLogicSigTransactionObject(txn1, lsig);

        //  let signedTxn = txn1.signTxn(account1.sk);


         // Submit the transaction
        //  await algodClient.sendRawTransaction(signedTxn).do();
        const { txId } = await algodClient.sendRawTransaction(stxn.blob).do();
 
         // Wait for confirmation
         let confirmedTxn = await waitForConfirmation(algodClient, txId, 4);
         //Get the completed Transaction
         console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);


    }
        catch (err) {
            console.log("err", err);
        }
}

firstTransaction()