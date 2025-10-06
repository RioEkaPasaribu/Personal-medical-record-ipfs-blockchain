package com.example.myapplication.network.response

import kotlinx.serialization.Serializable

@Serializable
data class ResponseTransactionHR(
  val transactionData: String,
  val recordId: String
)