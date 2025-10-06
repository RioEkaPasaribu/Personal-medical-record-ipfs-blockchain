package com.example.myapplication.module

import android.content.Context
import com.example.myapplication.utils.ConstUtil
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.metamask.androidsdk.*

@Module
@InstallIn(SingletonComponent::class)
internal object AppModule {
    @Provides
    fun provideDappMetadata(@ApplicationContext context: Context): DappMetadata {
        return DappMetadata(
            "Mediva",
            "https://${context.applicationInfo.name}.com"
        )
    }

    @Provides
    fun provideEthereumFlow(@ApplicationContext context: Context, dappMetadata: DappMetadata): EthereumFlow {
        val readonlyRPCMap = mapOf(ConstUtil.ethNetworkId to ConstUtil.ethRpcUrl)
        val sdkOptions = SDKOptions(
            infuraAPIKey = ConstUtil.ethInfuraApiKey,
            readonlyRPCMap = readonlyRPCMap
        )

        val ethereum = Ethereum(context, dappMetadata, sdkOptions)
        return EthereumFlow(ethereum)
    }
}