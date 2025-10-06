/* eslint-disable no-unused-vars */
const { Web3 } = require('web3')
const fs = require('fs-extra')

// PUBLIC ETHEREUM NETWORK
const sourcePublic = JSON.parse(
    fs.readFileSync(process.env.ETH_VERIFICATION_CONTRACT_PATH, 'utf8')
)
const abiPublic = sourcePublic.abi
const web3Public = new Web3(process.env.ETH_VERIFICATION_INFURA_URL)
const contractAddressPublic = process.env.ETH_VERIFICATION_CONTRACT_ADDRESS
const contractPublic = new web3Public.eth.Contract(
    abiPublic,
    contractAddressPublic
)

// PRIVATE ETHEREUM NETWORK
const sourcePrivate = JSON.parse(
    fs.readFileSync(process.env.ETH_STORAGE_CONTRACT_PATH, 'utf8')
)
const abiPrivate = sourcePrivate.abi

// PRIVATE ETHEREUM NETWORK 1
const web3Private1 = new Web3(process.env.ETH_STORAGE_INFURA_URL_1)
const contractAddressPrivate1 = process.env.ETH_STORAGE_CONTRACT_ADDRESS_1
const contractPrivate1 = new web3Private1.eth.Contract(
    abiPrivate,
    contractAddressPrivate1
)

// PRIVATE ETHEREUM NETWORK 2
const web3Private2 = new Web3(process.env.ETH_STORAGE_INFURA_URL_2)
const contractAddressPrivate2 = process.env.ETH_STORAGE_CONTRACT_ADDRESS_2
const contractPrivate2 = new web3Private2.eth.Contract(
    abiPrivate,
    contractAddressPrivate2
)

// PRIVATE ETHEREUM NETWORK 3
const web3Private3 = new Web3(process.env.ETH_STORAGE_INFURA_URL_3)
const contractAddressPrivate3 = process.env.ETH_STORAGE_CONTRACT_ADDRESS_3
const contractPrivate3 = new web3Private3.eth.Contract(
    abiPrivate,
    contractAddressPrivate3
)

// Simpan node dalam array dengan counter antrian
const privateNodes = [
    {
        position: 1,
        web3: web3Private1,
        contractAddress: contractAddressPrivate1,
        contract: contractPrivate1,
        privateKey: process.env.ETH_STORAGE_KEY_1,
        queue: 0,
        nonce: 0,
    },
    {
        position: 2,
        web3: web3Private2,
        contractAddress: contractAddressPrivate2,
        contract: contractPrivate2,
        privateKey: process.env.ETH_STORAGE_KEY_2,
        queue: 0,
        nonce: 0,
    },
    {
        position: 3,
        web3: web3Private3,
        contractAddress: contractAddressPrivate3,
        contract: contractPrivate3,
        privateKey: process.env.ETH_STORAGE_KEY_3,
        queue: 0,
        nonce: 0,
    },
]

const publicNode = {
    web3: web3Public,
    contractAddress: contractAddressPublic,
    contract: contractPublic,
}

let rrIndex = 0
// Round Robin untuk memilih node private
exports.getBestPrivate = function () {
    // Pilih node dengan antrian terkecil
    // let bestIndex = 0
    // let minQueue = privateNodes[0].queue
    // for (let i = 1; i < privateNodes.length; i++) {
    //     if (privateNodes[i].queue < minQueue) {
    //         minQueue = privateNodes[i].queue
    //         bestIndex = i
    //     }
    // }
    // // Tambah antrian saat node dipilih
    // privateNodes[bestIndex].queue++
    // console.log(
    //     `[NODE PICKED] Transaksi dikirim ke Node ${privateNodes[bestIndex].position}`
    // )
    // // Kembalikan node terbaik + fungsi untuk decrement queue setelah request selesai
    // return {
    //     web3: privateNodes[bestIndex].web3,
    //     contract: privateNodes[bestIndex].contract,
    //     contractAddress: privateNodes[bestIndex].contractAddress,
    //     privateKey: privateNodes[bestIndex].privateKey,
    //     position: privateNodes[bestIndex].position,
    //     queue: privateNodes[bestIndex].queue,
    //     done: () => {
    //         privateNodes[bestIndex].queue = Math.max(
    //             0,
    //             privateNodes[bestIndex].queue - 1
    //         )
    //     },
    // }

    // Pemilihan node dengan round robin
    const currentIndex = rrIndex % privateNodes.length
    const selectedNode = privateNodes[currentIndex]

    // Tingkatkan indeks untuk pemanggilan berikutnya
    rrIndex++

    // Tingkatkan penghitung antrian
    selectedNode.queue++

    console.log(
        `[NODE PICKED - ROUND ROBIN] Transaksi dikirim ke Node ${selectedNode.position}`
    )

    // Kembalikan node dengan fungsi done
    return {
        web3: selectedNode.web3,
        contract: selectedNode.contract,
        contractAddress: selectedNode.contractAddress,
        privateKey: selectedNode.privateKey,
        position: selectedNode.position,
        queue: selectedNode.queue,
        done: () => {
            selectedNode.queue = Math.max(0, selectedNode.queue - 1)
        },
    }

    //   Pemilihan node dengan random
    // const randomIndex = Math.floor(Math.random() * privateNodes.length)
    // const node = privateNodes[randomIndex]
    // node.queue++
    // console.log(
    //     `[NODE PICKED - RANDOM] Transaksi dikirim ke Node ${node.position}`
    // )
    // return {
    //     web3: node.web3,
    //     contract: node.contract,
    //     contractAddress: node.contractAddress,
    //     privateKey: node.privateKey,
    //     position: node.position,
    //     queue: node.queue,
    //     done: () => {
    //         node.queue = Math.max(0, node.queue - 1)
    //     },
    // }
}

exports.getPublic = function () {
    return publicNode
}

// exports.initWeb3 = function() {
//     const bestPrivateNode = exports.getBestPrivate();

//     return {
//         publicNode,
//         privateNode: bestPrivateNode
//     }
// }

exports.privateGetEthAddress = function (nodePrivate) {
    try {
        const account = nodePrivate.web3.eth.accounts.privateKeyToAccount(
            nodePrivate.privateKey
        )
        return account.address
    } catch (e) {
        console.log(e)
        return ''
    }
}

exports.privateSendTransaction = async function (data) {
    const txHashes = []
    let isValid = true

    for (const node of privateNodes) {
        try {
            node.queue++
            const account = node.web3.eth.accounts.privateKeyToAccount(
                node.privateKey
            )
            const ethAddress = account.address

            const targetNonce = await node.web3.eth.getTransactionCount(
                ethAddress,
                'pending'
            )
            if (node.nonce < targetNonce) {
                node.nonce = targetNonce
            }
            // const currentNonce = node.nonce
            // node.nonce++

            // Estimasi gas untuk deployment
            const deployOptions = {
                data: data,
            }

            const estimatedGas = await node.contract
                .deploy(deployOptions)
                .estimateGas({ from: ethAddress })
            const adjustEstimatedGas = Math.floor(Number(estimatedGas)) // +20% to avoid underpriced tx

            const gasPrice = await node.web3.eth.getGasPrice()
            const adjustedGasPrice = Math.floor(Number(gasPrice)) // +20% to avoid underpriced tx

            // const nonce = await node.web3.eth.getTransactionCount(ethAddress, 'pending');
            // console.log("Nonce:", nonce);

            const txData = {
                from: ethAddress,
                to: node.contractAddress,
                gas: adjustEstimatedGas,
                gasPrice: adjustedGasPrice,
                data: data,
                // nonce: currentNonce,
            }

            // Tanda tangani transaksi
            const signedTx = await node.web3.eth.accounts.signTransaction(
                txData,
                node.privateKey
            )
            // Kirim transaksi ke jaringan Ethereum
            const receipt = await node.web3.eth.sendSignedTransaction(
                signedTx.rawTransaction
            )
            node.queue = Math.max(0, node.queue - 1)

            txHashes.push(receipt.transactionHash)
        } catch (e) {
            console.log(`Error on node ${node.web3.currentProvider.host}:`, e)
            node.queue = Math.max(0, node.queue - 1)
            isValid = false
        }
    }

    if (!isValid) {
        return false
    }
    return txHashes
}

exports.publicSendTransaction = async function (web3Public, privateKey, data) {
    try {
        const account = web3Public.eth.accounts.privateKeyToAccount(privateKey)
        const ethAddress = account.address

        const gasPrice = await web3Public.eth.getGasPrice()
        const txData = {
            from: ethAddress,
            to: process.env.ETH_VERIFICATION_CONTRACT_ADDRESS,
            gasPrice: gasPrice,
            data,
        }

        // Tanda tangani transaksi
        const signedTx = await web3Public.eth.accounts.signTransaction(
            txData,
            privateKey
        )
        // Kirim transaksi ke jaringan Ethereum
        const receipt = await web3Public.eth.sendSignedTransaction(
            signedTx.rawTransaction
        )
        console.log(receipt)
        return true
    } catch (e) {
        console.log(e)
        return false
    }
}

// Gas transparency utility functions - BIGINT FIXES
exports.getGasInfo = async function (node, data, ethAddress) {
    const gasInfo = {
        estimatedGas: 0,
        gasLimit: 0,
        gasPrice: 0,
        estimatedCost: 0,
        balance: 0,
        balanceInEth: 0,
        canAfford: false,
        dataSize: 0,
        maxGasLimit: 30000000, // Typical block gas limit
        errorMessage: null
    }

    try {
        // Hitung ukuran data
        gasInfo.dataSize = Buffer.byteLength(data, 'utf8')
        console.log(`📊 Data size: ${gasInfo.dataSize} bytes (${(gasInfo.dataSize / 1024).toFixed(2)} KB)`)

        // Dapatkan gas price saat ini - FIXED: Handle zero gas price properly
        let rawGasPrice = await node.web3.eth.getGasPrice()
        
        // Convert to string first to handle any BigInt issues
        const rawGasPriceStr = rawGasPrice.toString()
        
        if (rawGasPriceStr === '0' || rawGasPrice == 0) {
            console.log('⚠️ WARNING: Gas price is 0 - this might be a development network')
            console.log('💡 Using actual gas price of 0 for free transactions')
            gasInfo.gasPrice = '0' // Keep as string to avoid BigInt issues
        } else {
            gasInfo.gasPrice = rawGasPriceStr // Convert to string
        }
        
        const gasPriceInGwei = gasInfo.gasPrice === '0' ? '0' : node.web3.utils.fromWei(gasInfo.gasPrice, 'gwei')
        console.log(`⛽ Current gas price: ${gasInfo.gasPrice} wei (${gasPriceInGwei} gwei)`)

        // Dapatkan balance
        gasInfo.balance = await node.web3.eth.getBalance(ethAddress)
        gasInfo.balanceInEth = node.web3.utils.fromWei(gasInfo.balance, 'ether')
        console.log(`💰 Account balance: ${gasInfo.balance} wei (${gasInfo.balanceInEth} ETH)`)

        // Estimasi gas - dengan penanganan error yang lebih baik
        try {
            const deployOptions = {
                data: data,
            }

            gasInfo.estimatedGas = await node.contract
                .deploy(deployOptions)
                .estimateGas({ from: ethAddress })
            
            console.log(`🔥 Estimated gas needed: ${gasInfo.estimatedGas}`)
            
        } catch (estimateError) {
            console.log(`❌ Gas estimation failed: ${estimateError.message}`)
            
            // Jika estimasi gagal, coba dengan gas limit maksimum
            gasInfo.estimatedGas = gasInfo.maxGasLimit
            gasInfo.errorMessage = "Gas estimation failed - data might be too large"
        }

        // Set gas limit (biasanya 20% lebih tinggi dari estimasi)
        // FIXED: Ensure proper number conversion before math operations
        const estimatedGasNumber = parseInt(gasInfo.estimatedGas.toString())
        gasInfo.gasLimit = Math.floor(estimatedGasNumber * 1.2)
        
        // FIXED: Calculate estimated cost without BigInt mixing
        if (gasInfo.gasPrice === '0') {
            // Free transaction
            gasInfo.estimatedCost = '0'
            console.log(`💸 Estimated transaction cost: 0 wei (0 ETH) - FREE TRANSACTION`)
        } else {
            // Use Web3.utils.toBN for safe arithmetic
            try {
                const gasPriceBN = node.web3.utils.toBN(gasInfo.gasPrice)
                const gasLimitBN = node.web3.utils.toBN(gasInfo.gasLimit.toString())
                const estimatedCostBN = gasPriceBN.mul(gasLimitBN)
                gasInfo.estimatedCost = estimatedCostBN.toString()
                
                const estimatedCostInEth = node.web3.utils.fromWei(gasInfo.estimatedCost, 'ether')
                console.log(`💸 Estimated transaction cost: ${gasInfo.estimatedCost} wei (${estimatedCostInEth} ETH)`)
            } catch (costCalcError) {
                console.log(`⚠️ Cost calculation error: ${costCalcError.message}`)
                gasInfo.estimatedCost = '0'
            }
        }
        
        // FIXED: Check if balance is sufficient with proper string comparison
        try {
            const balanceBN = node.web3.utils.toBN(gasInfo.balance.toString())
            const costBN = node.web3.utils.toBN(gasInfo.estimatedCost.toString())
            gasInfo.canAfford = balanceBN.gte(costBN)
        } catch (affordError) {
            console.log(`⚠️ Affordability check error: ${affordError.message}`)
            gasInfo.canAfford = true // Default to true if we can't calculate
        }
        
        console.log(`✅ Can afford transaction: ${gasInfo.canAfford}`)
        
        // Tambahan info tentang gas limit
        console.log(`📏 Gas limit set to: ${gasInfo.gasLimit}`)
        console.log(`🏗️ Block gas limit (approx): ${gasInfo.maxGasLimit}`)
        
        if (gasInfo.gasLimit > gasInfo.maxGasLimit) {
            console.log(`⚠️ WARNING: Required gas (${gasInfo.gasLimit}) exceeds typical block limit (${gasInfo.maxGasLimit})`)
            gasInfo.errorMessage = "Transaction requires more gas than block limit allows"
        }

        // Analisis ukuran data
        if (gasInfo.dataSize > 1024 * 1024) { // > 1MB
            console.log(`⚠️ WARNING: Data size is very large (${(gasInfo.dataSize / 1024 / 1024).toFixed(2)} MB)`)
            console.log(`💡 Consider splitting the data or using off-chain storage (IPFS, etc.)`)
        }

    } catch (error) {
        console.log(`❌ Error getting gas info: ${error.message}`)
        gasInfo.errorMessage = error.message
    }

    return gasInfo
}

// Enhanced privateSendTransaction with gas transparency - FIXED VERSION
exports.privateSendTransactionWithGasInfo = async function (data) {
    const txHashes = []
    let isValid = true
    
    console.log('\n🚀 Starting transaction with gas transparency...')
    console.log('=' .repeat(60))

    for (const node of privateNodes) {
        try {
            node.queue++
            const account = node.web3.eth.accounts.privateKeyToAccount(
                node.privateKey
            )
            const ethAddress = account.address
            
            console.log(`\n📍 Processing Node ${node.position}`)
            console.log(`🔗 Node address: ${ethAddress}`)
            
            // Dapatkan informasi gas yang detail
            const gasInfo = await exports.getGasInfo(node, data, ethAddress)
            
            // Tampilkan ringkasan gas
            console.log('\n📋 GAS SUMMARY:')
            console.log(`   • Data size: ${gasInfo.dataSize} bytes`)
            console.log(`   • Estimated gas: ${gasInfo.estimatedGas}`)
            console.log(`   • Gas limit: ${gasInfo.gasLimit}`)
            console.log(`   • Gas price: ${gasInfo.gasPrice} wei`)
            console.log(`   • Estimated cost: ${node.web3.utils.fromWei(gasInfo.estimatedCost.toString(), 'ether')} ETH`)
            console.log(`   • Account balance: ${gasInfo.balanceInEth} ETH`)
            console.log(`   • Can afford: ${gasInfo.canAfford ? '✅ YES' : '❌ NO'}`)
            
            // Cek apakah ada error dengan gas
            if (gasInfo.errorMessage) {
                console.log(`   • Error: ${gasInfo.errorMessage}`)
                throw new Error(gasInfo.errorMessage)
            }
            
            if (!gasInfo.canAfford) {
                throw new Error(`Insufficient balance. Need ${node.web3.utils.fromWei(gasInfo.estimatedCost.toString(), 'ether')} ETH, have ${gasInfo.balanceInEth} ETH`)
            }

            const targetNonce = await node.web3.eth.getTransactionCount(
                ethAddress,
                'pending'
            )
            if (node.nonce < targetNonce) {
                node.nonce = targetNonce
            }

            // FIXED: Ensure all gas values are properly converted to numbers/strings
            const txData = {
                from: ethAddress,
                to: node.contractAddress,
                gas: Number(gasInfo.gasLimit), // Ensure it's a number
                gasPrice: String(gasInfo.gasPrice), // Ensure it's a string
                data: data,
                nonce: Number(node.nonce) // Ensure nonce is a number
            }

            console.log(`\n🔄 Sending transaction...`)
            console.log(`   • Nonce: ${node.nonce}`)
            
            // Tanda tangani transaksi
            const signedTx = await node.web3.eth.accounts.signTransaction(
                txData,
                node.privateKey
            )
            
            // Kirim transaksi ke jaringan Ethereum
            const receipt = await node.web3.eth.sendSignedTransaction(
                signedTx.rawTransaction
            )
            
            node.queue = Math.max(0, node.queue - 1)
            node.nonce++ // Increment nonce for next transaction
            txHashes.push(receipt.transactionHash)
            
            // FIXED: Calculate actual cost with completely BigInt-free approach
            try {
                console.log(`   • Gas used: ${receipt.gasUsed}`)
                
                // Safe efficiency calculation
                const gasUsedNum = Number(receipt.gasUsed.toString())
                const gasLimitNum = Number(gasInfo.gasLimit.toString())
                const efficiency = ((gasUsedNum / gasLimitNum) * 100).toFixed(2)
                console.log(`   • Gas efficiency: ${efficiency}%`)
                
                // Handle cost calculation without any BigInt operations
                const gasUsedStr = receipt.gasUsed.toString()
                const gasPriceStr = gasInfo.gasPrice.toString()
                
                if (gasPriceStr === '0') {
                    console.log(`   • Actual cost: 0 ETH (free transaction)`)
                } else {
                    // Use Web3's BN library for safe calculation
                    const gasUsedBN = node.web3.utils.toBN(gasUsedStr)
                    const gasPriceBN = node.web3.utils.toBN(gasPriceStr)
                    const actualCostBN = gasUsedBN.mul(gasPriceBN)
                    const actualCostInEth = node.web3.utils.fromWei(actualCostBN.toString(), 'ether')
                    console.log(`   • Actual cost: ${actualCostInEth} ETH`)
                }
            } catch (costError) {
                console.log(`   • Actual cost: Unable to calculate (${costError.message})`)
            }
            
        } catch (e) {
            console.log(`❌ Error on node ${node.position}:`, e.message)
            node.queue = Math.max(0, node.queue - 1)
            isValid = false
            
            // Analisis error khusus untuk out of gas
            if (e.message.includes('out of gas') || e.message.includes('Out of gas')) {
                console.log('\n🔍 OUT OF GAS ANALYSIS:')
                console.log('   • The transaction requires more gas than available')
                console.log('   • This usually means the data is too large for blockchain storage')
                console.log('   • Consider these alternatives:')
                console.log('     - Split the data into smaller chunks')
                console.log('     - Store large data off-chain (IPFS, centralized storage)')
                console.log('     - Store only hash/metadata on-chain')
                console.log('     - Use layer-2 solutions for cheaper transactions')
            }
        }
    }

    console.log('\n' + '=' .repeat(60))
    console.log(`🏁 Transaction process completed. Success: ${isValid}`)
    
    if (!isValid) {
        return false
    }
    return txHashes
}

// Utility function untuk mengecek apakah data terlalu besar
exports.checkDataSize = function(data) {
    const dataSize = Buffer.byteLength(data, 'utf8')
    const maxRecommendedSize = 1024 * 100 // 100KB
    const maxPracticalSize = 1024 * 1024 // 1MB
    
    console.log(`\n📏 DATA SIZE ANALYSIS:`)
    console.log(`   • Current size: ${dataSize} bytes (${(dataSize / 1024).toFixed(2)} KB)`)
    console.log(`   • Recommended max: ${maxRecommendedSize} bytes (${maxRecommendedSize / 1024} KB)`)
    console.log(`   • Practical max: ${maxPracticalSize} bytes (${maxPracticalSize / 1024} KB)`)
    
    if (dataSize > maxPracticalSize) {
        console.log(`   • Status: 🔴 TOO LARGE - Will likely fail`)
        console.log(`   • Recommendation: Use off-chain storage`)
        return { status: 'too_large', dataSize, recommended: false }
    } else if (dataSize > maxRecommendedSize) {
        console.log(`   • Status: 🟡 LARGE - May be expensive`)
        console.log(`   • Recommendation: Consider optimization`)
        return { status: 'large', dataSize, recommended: false }
    } else {
        console.log(`   • Status: 🟢 ACCEPTABLE`)
        return { status: 'acceptable', dataSize, recommended: true }
    }
}

// Additional utility function for safe BigInt operations
exports.safeBigIntOperation = function(operation, ...values) {
    try {
        const bigIntValues = values.map(v => BigInt(v.toString()))
        
        switch (operation) {
            case 'multiply':
                return bigIntValues.reduce((acc, val) => acc * val, BigInt(1))
            case 'add':
                return bigIntValues.reduce((acc, val) => acc + val, BigInt(0))
            case 'subtract':
                return bigIntValues.reduce((acc, val) => acc - val)
            case 'divide':
                return bigIntValues.reduce((acc, val) => acc / val)
            case 'compare':
                return bigIntValues[0] >= bigIntValues[1]
            default:
                throw new Error('Unsupported operation')
        }
    } catch (error) {
        console.log(`❌ BigInt operation error: ${error.message}`)
        return null
    }
}

// ADDITIONAL UTILITY: Handle zero gas price scenario
exports.handleZeroGasPrice = async function(node) {
    const gasPrice = await node.web3.eth.getGasPrice()
    
    if (gasPrice === '0' || gasPrice === 0) {
        console.log('⚠️ WARNING: Gas price is 0 - this might be a development network')
        console.log('💡 Using minimum gas price of 1 gwei for calculations')
        return node.web3.utils.toWei('1', 'gwei')
    }
    
    return gasPrice
}

// IMPROVED VERSION: getGasInfo with enhanced error handling
exports.getGasInfoImproved = async function (node, data, ethAddress) {
    const gasInfo = {
        estimatedGas: 0,
        gasLimit: 0,
        gasPrice: 0,
        estimatedCost: 0,
        balance: 0,
        balanceInEth: 0,
        canAfford: false,
        dataSize: 0,
        maxGasLimit: 30000000,
        errorMessage: null
    }

    try {
        // Hitung ukuran data
        gasInfo.dataSize = Buffer.byteLength(data, 'utf8')
        console.log(`📊 Data size: ${gasInfo.dataSize} bytes (${(gasInfo.dataSize / 1024).toFixed(2)} KB)`)

        // Dapatkan gas price dengan handling untuk zero price
        gasInfo.gasPrice = await exports.handleZeroGasPrice(node)
        console.log(`⛽ Current gas price: ${gasInfo.gasPrice} wei (${node.web3.utils.fromWei(gasInfo.gasPrice.toString(), 'gwei')} gwei)`)

        // Dapatkan balance
        gasInfo.balance = await node.web3.eth.getBalance(ethAddress)
        gasInfo.balanceInEth = node.web3.utils.fromWei(gasInfo.balance, 'ether')
        console.log(`💰 Account balance: ${gasInfo.balance} wei (${gasInfo.balanceInEth} ETH)`)

        // Estimasi gas
        try {
            const deployOptions = { data: data }
            gasInfo.estimatedGas = await node.contract
                .deploy(deployOptions)
                .estimateGas({ from: ethAddress })
            
            console.log(`🔥 Estimated gas needed: ${gasInfo.estimatedGas}`)
            
        } catch (estimateError) {
            console.log(`❌ Gas estimation failed: ${estimateError.message}`)
            gasInfo.estimatedGas = gasInfo.maxGasLimit
            gasInfo.errorMessage = "Gas estimation failed - data might be too large"
        }

        // Set gas limit
        gasInfo.gasLimit = Math.floor(gasInfo.estimatedGas * 1.2)
        
        // FIXED: Proper BigInt handling dengan try-catch
        try {
            const gasPriceBigInt = BigInt(gasInfo.gasPrice.toString())
            const gasLimitBigInt = BigInt(gasInfo.gasLimit.toString())
            gasInfo.estimatedCost = gasLimitBigInt * gasPriceBigInt
            
            const estimatedCostInEth = node.web3.utils.fromWei(gasInfo.estimatedCost.toString(), 'ether')
            console.log(`💸 Estimated transaction cost: ${gasInfo.estimatedCost} wei (${estimatedCostInEth} ETH)`)
            
            // FIXED: Proper BigInt comparison
            const balanceBigInt = BigInt(gasInfo.balance.toString())
            gasInfo.canAfford = balanceBigInt >= gasInfo.estimatedCost
            
        } catch (bigIntError) {
            console.log(`❌ BigInt calculation error: ${bigIntError.message}`)
            gasInfo.errorMessage = `BigInt calculation failed: ${bigIntError.message}`
            gasInfo.canAfford = false
        }
        
        console.log(`✅ Can afford transaction: ${gasInfo.canAfford}`)
        
        // Check gas limit vs block limit
        if (gasInfo.gasLimit > gasInfo.maxGasLimit) {
            console.log(`⚠️ WARNING: Required gas (${gasInfo.gasLimit}) exceeds typical block limit (${gasInfo.maxGasLimit})`)
            gasInfo.errorMessage = "Transaction requires more gas than block limit allows"
        }

        // Analyze data size
        if (gasInfo.dataSize > 1024 * 1024) {
            console.log(`⚠️ WARNING: Data size is very large (${(gasInfo.dataSize / 1024 / 1024).toFixed(2)} MB)`)
            console.log(`💡 Consider splitting the data or using off-chain storage (IPFS, etc.)`)
        }

    } catch (error) {
        console.log(`❌ Error getting gas info: ${error.message}`)
        gasInfo.errorMessage = error.message
    }

    return gasInfo
}

// DEBUG UTILITY: Test BigInt operations
exports.testBigIntOperations = function(gasPrice, gasLimit, balance) {
    console.log('\n🔍 DEBUGGING BigInt Operations:')
    
    try {
        console.log(`Input values:`)
        console.log(`  gasPrice: ${gasPrice} (type: ${typeof gasPrice})`)
        console.log(`  gasLimit: ${gasLimit} (type: ${typeof gasLimit})`)
        console.log(`  balance: ${balance} (type: ${typeof balance})`)
        
        // Test conversions
        const gasPriceBigInt = BigInt(gasPrice.toString())
        const gasLimitBigInt = BigInt(gasLimit.toString())
        const balanceBigInt = BigInt(balance.toString())
        
        console.log(`Converted to BigInt:`)
        console.log(`  gasPriceBigInt: ${gasPriceBigInt}`)
        console.log(`  gasLimitBigInt: ${gasLimitBigInt}`)
        console.log(`  balanceBigInt: ${balanceBigInt}`)
        
        // Test multiplication
        const estimatedCost = gasLimitBigInt * gasPriceBigInt
        console.log(`  estimatedCost: ${estimatedCost}`)
        
        // Test comparison
        const canAfford = balanceBigInt >= estimatedCost
        console.log(`  canAfford: ${canAfford}`)
        
        console.log('✅ BigInt operations successful!')
        return true
        
    } catch (error) {
        console.log(`❌ BigInt operation failed: ${error.message}`)
        return false
    }
}
// FIXED VERSION: Proper type handling for gas calculations
exports.getGasInfoFixed = async function (node, data, ethAddress) {
    const gasInfo = {
        estimatedGas: 0,
        gasLimit: 0,
        gasPrice: 0,
        estimatedCost: 0,
        balance: 0,
        balanceInEth: 0,
        canAfford: false,
        dataSize: 0,
        maxGasLimit: 30000000,
        errorMessage: null
    }

    try {
        // Hitung ukuran data
        gasInfo.dataSize = Buffer.byteLength(data, 'utf8')
        console.log(`📊 Data size: ${gasInfo.dataSize} bytes (${(gasInfo.dataSize / 1024).toFixed(2)} KB)`)

        // Dapatkan gas price dengan proper handling
        let rawGasPrice = await node.web3.eth.getGasPrice()
        
        // FIXED: Proper zero gas price handling
        if (rawGasPrice === '0' || rawGasPrice === 0 || rawGasPrice === BigInt(0)) {
            console.log('⚠️ WARNING: Gas price is 0 - this might be a development network')
            console.log('💡 Using minimum gas price of 1 gwei for calculations')
            gasInfo.gasPrice = node.web3.utils.toWei('1', 'gwei')
        } else {
            gasInfo.gasPrice = rawGasPrice
        }
        
        // FIXED: Ensure gasPrice is always a string for consistent handling
        gasInfo.gasPrice = gasInfo.gasPrice.toString()
        
        console.log(`⛽ Current gas price: ${gasInfo.gasPrice} wei (${node.web3.utils.fromWei(gasInfo.gasPrice, 'gwei')} gwei)`)

        // Dapatkan balance
        gasInfo.balance = await node.web3.eth.getBalance(ethAddress)
        gasInfo.balanceInEth = node.web3.utils.fromWei(gasInfo.balance, 'ether')
        console.log(`💰 Account balance: ${gasInfo.balance} wei (${gasInfo.balanceInEth} ETH)`)

        // Estimasi gas
        try {
            const deployOptions = { data: data }
            gasInfo.estimatedGas = await node.contract
                .deploy(deployOptions)
                .estimateGas({ from: ethAddress })
            
            console.log(`🔥 Estimated gas needed: ${gasInfo.estimatedGas}`)
            
        } catch (estimateError) {
            console.log(`❌ Gas estimation failed: ${estimateError.message}`)
            gasInfo.estimatedGas = gasInfo.maxGasLimit
            gasInfo.errorMessage = "Gas estimation failed - data might be too large"
        }

        // Set gas limit
        gasInfo.gasLimit = Math.floor(gasInfo.estimatedGas * 1.2)
        
        // FIXED: Proper BigInt handling dengan explicit conversion
        try {
            // Convert semua ke string dulu, lalu ke BigInt
            const gasPriceStr = gasInfo.gasPrice.toString()
            const gasLimitStr = gasInfo.gasLimit.toString()
            const balanceStr = gasInfo.balance.toString()
            
            const gasPriceBigInt = BigInt(gasPriceStr)
            const gasLimitBigInt = BigInt(gasLimitStr)
            const balanceBigInt = BigInt(balanceStr)
            
            // Kalkulasi estimasi cost
            gasInfo.estimatedCost = gasLimitBigInt * gasPriceBigInt
            
            const estimatedCostInEth = node.web3.utils.fromWei(gasInfo.estimatedCost.toString(), 'ether')
            console.log(`💸 Estimated transaction cost: ${gasInfo.estimatedCost} wei (${estimatedCostInEth} ETH)`)
            
            // Check balance
            gasInfo.canAfford = balanceBigInt >= gasInfo.estimatedCost
            
        } catch (bigIntError) {
            console.log(`❌ BigInt calculation error: ${bigIntError.message}`)
            console.log(`Debug info:`)
            console.log(`  gasPrice: ${gasInfo.gasPrice} (type: ${typeof gasInfo.gasPrice})`)
            console.log(`  gasLimit: ${gasInfo.gasLimit} (type: ${typeof gasInfo.gasLimit})`)
            console.log(`  balance: ${gasInfo.balance} (type: ${typeof gasInfo.balance})`)
            
            gasInfo.errorMessage = `BigInt calculation failed: ${bigIntError.message}`
            gasInfo.canAfford = false
        }
        
        console.log(`✅ Can afford transaction: ${gasInfo.canAfford}`)
        
        // Additional checks
        if (gasInfo.gasLimit > gasInfo.maxGasLimit) {
            console.log(`⚠️ WARNING: Required gas (${gasInfo.gasLimit}) exceeds typical block limit (${gasInfo.maxGasLimit})`)
            gasInfo.errorMessage = "Transaction requires more gas than block limit allows"
        }

        if (gasInfo.dataSize > 1024 * 1024) {
            console.log(`⚠️ WARNING: Data size is very large (${(gasInfo.dataSize / 1024 / 1024).toFixed(2)} MB)`)
            console.log(`💡 Consider splitting the data or using off-chain storage (IPFS, etc.)`)
        }

    } catch (error) {
        console.log(`❌ Error getting gas info: ${error.message}`)
        gasInfo.errorMessage = error.message
    }

    return gasInfo
}

// ALTERNATIVE SOLUTION: Use the same approach as privateSendTransaction
exports.getGasInfoSimple = async function (node, data, ethAddress) {
    const gasInfo = {
        estimatedGas: 0,
        gasLimit: 0,
        gasPrice: 0,
        estimatedCost: 0,
        balance: 0,
        balanceInEth: 0,
        canAfford: false,
        dataSize: 0,
        maxGasLimit: 30000000,
        errorMessage: null
    }

    try {
        // Hitung ukuran data
        gasInfo.dataSize = Buffer.byteLength(data, 'utf8')
        console.log(`📊 Data size: ${gasInfo.dataSize} bytes (${(gasInfo.dataSize / 1024).toFixed(2)} KB)`)

        // MENGGUNAKAN APPROACH YANG SAMA DENGAN privateSendTransaction
        const rawGasPrice = await node.web3.eth.getGasPrice()
        gasInfo.gasPrice = Math.floor(Number(rawGasPrice)) // Convert to Number seperti privateSendTransaction
        
        // Handle zero gas price
        if (gasInfo.gasPrice === 0) {
            console.log('⚠️ WARNING: Gas price is 0 - using 1 gwei for calculations')
            gasInfo.gasPrice = Math.floor(Number(node.web3.utils.toWei('1', 'gwei')))
        }
        
        console.log(`⛽ Current gas price: ${gasInfo.gasPrice} wei (${node.web3.utils.fromWei(gasInfo.gasPrice.toString(), 'gwei')} gwei)`)

        // Dapatkan balance
        const rawBalance = await node.web3.eth.getBalance(ethAddress)
        gasInfo.balance = Number(rawBalance) // Convert to Number
        gasInfo.balanceInEth = node.web3.utils.fromWei(rawBalance, 'ether')
        console.log(`💰 Account balance: ${rawBalance} wei (${gasInfo.balanceInEth} ETH)`)

        // Estimasi gas
        try {
            const deployOptions = { data: data }
            const rawEstimatedGas = await node.contract
                .deploy(deployOptions)
                .estimateGas({ from: ethAddress })
            
            gasInfo.estimatedGas = Math.floor(Number(rawEstimatedGas)) // Convert to Number
            console.log(`🔥 Estimated gas needed: ${gasInfo.estimatedGas}`)
            
        } catch (estimateError) {
            console.log(`❌ Gas estimation failed: ${estimateError.message}`)
            gasInfo.estimatedGas = gasInfo.maxGasLimit
            gasInfo.errorMessage = "Gas estimation failed - data might be too large"
        }

        // Set gas limit (20% buffer)
        gasInfo.gasLimit = Math.floor(gasInfo.estimatedGas * 1.2)
        
        // SIMPLE CALCULATION using Numbers (like privateSendTransaction)
        gasInfo.estimatedCost = gasInfo.gasLimit * gasInfo.gasPrice
        
        const estimatedCostInEth = node.web3.utils.fromWei(gasInfo.estimatedCost.toString(), 'ether')
        console.log(`💸 Estimated transaction cost: ${gasInfo.estimatedCost} wei (${estimatedCostInEth} ETH)`)
        
        // Check if can afford
        gasInfo.canAfford = gasInfo.balance >= gasInfo.estimatedCost
        
        console.log(`✅ Can afford transaction: ${gasInfo.canAfford}`)
        
        // Additional checks
        if (gasInfo.gasLimit > gasInfo.maxGasLimit) {
            console.log(`⚠️ WARNING: Required gas (${gasInfo.gasLimit}) exceeds typical block limit (${gasInfo.maxGasLimit})`)
            gasInfo.errorMessage = "Transaction requires more gas than block limit allows"
        }

    } catch (error) {
        console.log(`❌ Error getting gas info: ${error.message}`)
        gasInfo.errorMessage = error.message
    }

    return gasInfo
}