const { Web3 } = require('web3');
const fs = require('fs-extra');

// Konfigurasi: Smart Contract untuk menyimpan data kesehatan
const private_key_simpan = "0x0f141f1c3d413acee5555cd01c63d9d09142d12cb3a6dc8eb925ad3259bd1afd";
const url_simpan ="http://172.21.200.101:8545"
const contract_path_simpan ="./build/contracts/StorageHealthRecords.json"
const web3_simpan = new Web3(url_simpan);
const source_simpan = JSON.parse(fs.readFileSync(contract_path_simpan, 'utf8'))
const abi_simpan = source_simpan.abi

// Konfigurasi: Smart Contract untuk melakukan verifikasi data kesehatan
const private_key_verifikasi = "0x0f141f1c3d413acee5555cd01c63d9d09142d12cb3a6dc8eb925ad3259bd1afd";
const url_verifikasi ="http://172.21.200.101:8545"
const contract_path_verifikasi ="./build/contracts/VerificationHealthRecords.json"
const web3_verifikasi = new Web3(url_verifikasi);
const source_verifikasi = JSON.parse(fs.readFileSync(contract_path_verifikasi, 'utf8'))
const abi_verifikasi = source_verifikasi.abi

async function deploySmartContract(label, web3, privateKey, contractPath) {
    console.log(`\n\nMendeploy kontrak ${label} ke blockchain...`);
    let contractAddress = '';

    const requestTime = performance.now();
    try {
        // Inisialisasi akun dengan private key
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;

        console.log('Akun Ethereum:', account.address);

        // Baca file kontrak secara async
        const source = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

        if (!source.abi || !source.bytecode) {
            throw new Error('Data ABI atau Bytecode tidak tersedia di file kontrak.');
        }

        const { abi, bytecode } = source;

        // Dapatkan gas price dari network
        const gasPrice = await web3.eth.getGasPrice();
        
        // Deploy kontrak dengan legacy transaction format
        console.log('Mendeploy kontrak...');
        const contract = new web3.eth.Contract(abi);
        
        // Check bytecode
        if (!bytecode || bytecode === '0x') {
            throw new Error('Bytecode kosong atau tidak valid');
        }
        
        console.log('Bytecode length:', bytecode.length);
        console.log('Account balance:', await web3.eth.getBalance(account.address));
        
        // Estimate gas for deployment
        const deployData = contract.deploy({ data: bytecode });
        const gasEstimate = await deployData.estimateGas({ from: account.address });
        
        console.log('Gas estimate for deployment:', gasEstimate.toString());
        
        const contractInstance = await deployData.send({
            from: account.address,
            gas: Math.floor(Number(gasEstimate) * 1.5), // Convert BigInt to Number and add 50% buffer
            gasPrice: Number(gasPrice), // Convert BigInt to Number
        });

        contractAddress = contractInstance.options.address;
        console.log('Kontrak berhasil dideploy di:', contractAddress);
    } catch (error) {
        console.error('Terjadi kesalahan:', error.message);
    }
    const responseTime = performance.now();
    const latency = responseTime - requestTime;

    console.log('Request Time:', requestTime, 'ms');
    console.log('Response Time:', responseTime, 'ms');
    console.log('Latency:', latency, 'ms');

    return {
        contractAddress,
        latency
    }
}

async function sendTransaction(label, contractAddress, data, web3, privateKey) {
    console.log(`\n\nMengirimkan transaksi ${label} ke kontrak di alamat: ${contractAddress}`);
    let transactionHash = '';

    const requestTime = performance.now();
    try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const ethAddress = account.address;

        const gasPrice = await web3.eth.getGasPrice()
        
        // Estimate gas untuk transaksi
        const gasEstimate = await web3.eth.estimateGas({
            from: ethAddress,
            to: contractAddress,
            data: data
        });

        const txData = {
            from: ethAddress,
            to: contractAddress,
            gas: Math.floor(Number(gasEstimate) * 1.2), // Convert BigInt to Number and add 20% buffer
            gasPrice: Number(gasPrice), // Convert BigInt to Number
            data, // Data transaksi
        }

        // Tanda tangani transaksi
        const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
        // Kirim transaksi ke jaringan Ethereum
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        transactionHash = receipt.transactionHash;
        console.log('Transaksi berhasil dikirim dengan hash:', transactionHash);
    } catch (e) {
        console.log(`Error: `, e);
    }
    const responseTime = performance.now();
    const latency = responseTime - requestTime;
    
    console.log('Request Time:', requestTime, 'ms');
    console.log('Response Time:', responseTime, 'ms');
    console.log('Latency:', latency, 'ms');

    return {
        latency,
        transactionHash
    }
} 

(async () => {
    console.log('Pengujian hybrid blockchain dimulai...');

    const dataTest = {
        message: "Testing Send Transaction",
    }

    let totalLatencyDeplotSmartContractSimpan = 0;
    let totalLatencyDeplotSmartContractVerifikasi = 0;
    let totalLatencyTransactionSimpan = 0;
    let totalLatencyTransactionVerifikasi = 0;
    
    for(let i = 1; i <= 3; i++) {
        console.log("\n\nPengujian ke-", i, " untuk kontrak simpan dan verifikasi data kesehatan");

        // Mendeploy smart contract simpan
        const smartContractSimpan = await deploySmartContract("simpan", web3_simpan, private_key_simpan, contract_path_simpan);
        totalLatencyDeplotSmartContractSimpan += smartContractSimpan.latency;
        
        // Only proceed with transaction if deployment was successful
        if (smartContractSimpan.contractAddress) {
            // Melakukan Transaksi ke kontrak simpan
            const contractSimpan = new web3_simpan.eth.Contract(abi_simpan, smartContractSimpan.contractAddress);
            const dataTransactionSimpan = contractSimpan.methods.testSendTransaction(
                ...Object.values(dataTest)
            )
            const resultTransactionSimpan = await sendTransaction("Simpan", smartContractSimpan.contractAddress, dataTransactionSimpan.encodeABI(), web3_simpan, private_key_simpan);
            totalLatencyTransactionSimpan += resultTransactionSimpan.latency;
        }

        // Mendeploy smart contract verifikasi
        const smartContractVerifikasi = await deploySmartContract("verifikasi", web3_verifikasi, private_key_verifikasi, contract_path_verifikasi);
        totalLatencyDeplotSmartContractVerifikasi += smartContractVerifikasi.latency;

        // Only proceed with transaction if deployment was successful
        if (smartContractVerifikasi.contractAddress) {
            // Melakukan Transaksi ke kontrak verifikasi
            const contractVerifikasi = new web3_verifikasi.eth.Contract(abi_verifikasi, smartContractVerifikasi.contractAddress);
            const dataTransactionVerifikasi = contractVerifikasi.methods.testSendTransaction(
                ...Object.values(dataTest)
            )
            const resultTransactionVerifikasi = await sendTransaction("Verifikasi", smartContractVerifikasi.contractAddress, dataTransactionVerifikasi.encodeABI(), web3_verifikasi, private_key_verifikasi);
            totalLatencyTransactionVerifikasi += resultTransactionVerifikasi.latency;
        }
    }

    console.log("\n\nHasil Pengujian Blockchain:");
    
    const avgLatencyDeploySimpan = totalLatencyDeplotSmartContractSimpan / 3;
    console.log('Rata-rata Latency Deploy Smart Contract Simpan:', avgLatencyDeploySimpan, 'ms');

    const avgLatencyTransactionSimpan = totalLatencyTransactionSimpan / 3;
    console.log('Rata-rata Latency Transaksi Simpan:', avgLatencyTransactionSimpan, 'ms');

    const avgLatencyDeployVerifikasi = totalLatencyDeplotSmartContractVerifikasi / 3;
    console.log('Rata-rata Latency Deploy Smart Contract Verifikasi:', avgLatencyDeployVerifikasi, 'ms');

    const avgLatencyTransactionVerifikasi = totalLatencyTransactionVerifikasi / 3;
    console.log('Rata-rata Latency Transaksi Verifikasi:', avgLatencyTransactionVerifikasi, 'ms');

    console.log("");
    console.log('Pengujian Blockchain Selesai.');
})();