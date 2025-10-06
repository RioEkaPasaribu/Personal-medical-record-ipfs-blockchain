package com.example.myapplication.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.myapplication.ui.screens.AddHealthRecordScreen
import com.example.myapplication.ui.screens.DetailHealthRecordScreen
import com.example.myapplication.ui.screens.DoctorHealthRecordsScreen
import com.example.myapplication.ui.screens.DoctorPatientsScreen
import com.example.myapplication.ui.screens.HomeScreen
import com.example.myapplication.ui.screens.LoginScreen
import com.example.myapplication.ui.screens.MetaMaskConnectScreen
import com.example.myapplication.ui.screens.PatientDoctorsScreen
import com.example.myapplication.ui.screens.PatientHealthRecordsScreen
import com.example.myapplication.ui.screens.ProfileScreen
import com.example.myapplication.ui.screens.RegisterScreen
import com.example.myapplication.ui.screens.UpdateHealthRecordScreen
import com.example.myapplication.ui.viewModels.EventSinkMetaMask
import com.example.myapplication.ui.viewModels.MetaMaskViewModel
import com.example.myapplication.ui.viewModels.PMRViewModel


enum class PMRScreenEnum(val title: String) {
  Welcome(title = "Welcome"),
  Login(title = "login"),
  Logout(title = "Logout"),

  Register(title = "register"),
  Home(title = "Home"),
  Profile(title = "Profile"),

  // Patient
  PatientDoctors(title = "PatientDoctors"),
  PatientHealthRecords(title = "PatientHealthRecords"),
  PatientAddHealthRecord(title = "PatientAddHealthRecord"),

  // Doctor
  DoctorPatients(title = "DoctorPatients"),
  DoctorHealthRecords(title = "DoctorHealthRecords"),


  AddHealthRecord(title = "AddHealthRecord"),
  UpdateHealthRecord(title = "UpdateHealthRecord"),
  DetailHealthRecord(title = "DetailHealthRecord"),
}

@Composable
fun PMRApp(
  metaMaskViewModel: MetaMaskViewModel,
  pmrViewModel: PMRViewModel,
  navController: NavHostController = rememberNavController(),
) {
  // Inisialisasi SnackbarHostState
  val snackbarHostState = remember { SnackbarHostState() }

  Scaffold(
    snackbarHost = { SnackbarHost(snackbarHostState) }
  ) { innerPadding ->
    NavHost(
      navController = navController,
      startDestination = PMRScreenEnum.Welcome.name,
      modifier = Modifier
        .fillMaxSize()
        .verticalScroll(rememberScrollState())
        .padding(innerPadding)
    ) {
      composable(route = PMRScreenEnum.Welcome.name) {
        // reset posisi screen
        ScreenToUp(navController, PMRScreenEnum.Welcome.name)

        MetaMaskConnectScreen(
          navController,
          metaMaskViewModel = metaMaskViewModel,
          pmrViewModel = pmrViewModel,
          snackbarHost = snackbarHostState,
        )
      }

      composable(
        route = PMRScreenEnum.Login.name,
        // arguments = listOf(navArgument("ethAddress") { type = NavType.StringType })
      ) { backStackEntry ->
        // reset posisi screen
        ScreenToUp(navController, PMRScreenEnum.Login.name)

        // val ethAddress = backStackEntry.arguments?.getString("ethAddress") ?: ""
        LoginScreen(
          navController,
          metaMaskViewModel,
          pmrViewModel,
          snackbarHost = snackbarHostState
        )
      }

      composable(
        route = PMRScreenEnum.Logout.name,
        // arguments = listOf(navArgument("ethAddress") { type = NavType.StringType })
      ) { backStackEntry ->
        metaMaskViewModel.eventSink(EventSinkMetaMask.Disconnect)

        navController.navigate(PMRScreenEnum.Login.name) {
          popUpTo(navController.graph.startDestinationId) { inclusive = false } // Hapus semua stack
        }
        return@composable // 🔥 Stop eksekusi di sini
      }

      composable(
        route = PMRScreenEnum.Register.name,
        // arguments = listOf(navArgument("ethAddress") { type = NavType.StringType })
      ) { backStackEntry ->
        // reset register screen
        ScreenToUp(navController, PMRScreenEnum.Register.name)

        // val ethAddress = backStackEntry.arguments?.getString("ethAddress") ?: ""
        RegisterScreen(
          navController,
          metaMaskViewModel,
          pmrViewModel,
          snackbarHost = snackbarHostState,
        )
      }
      composable(
        route = PMRScreenEnum.Home.name,
      ) { backStackEntry ->
        // reset posisi screen
        ScreenToUp(navController, PMRScreenEnum.Home.name)

        HomeScreen(
          navController,
          metaMaskViewModel,
          pmrViewModel,
          snackbarHost = snackbarHostState,
        )
      }

      composable(
        route = PMRScreenEnum.Profile.name,
      ) { backStackEntry ->
        ProfileScreen(
          navController,
          metaMaskViewModel,
          pmrViewModel,
          snackbarHost = snackbarHostState,
        )
      }

      composable(
        route = PMRScreenEnum.PatientHealthRecords.name,
      ) { backStackEntry ->
        // reset posisi screen
        ScreenToUp(navController, PMRScreenEnum.PatientHealthRecords.name)

        PatientHealthRecordsScreen(
          navController,
          metaMaskViewModel,
          pmrViewModel,
          snackbarHost = snackbarHostState,
        )
      }

      composable(
        route = PMRScreenEnum.PatientDoctors.name,
      ) { backStackEntry ->
        // reset posisi screen
        ScreenToUp(navController, PMRScreenEnum.PatientDoctors.name)

        PatientDoctorsScreen(
          navController,
          metaMaskViewModel,
          pmrViewModel,
          snackbarHost = snackbarHostState,
        )
      }

      composable(
        route = PMRScreenEnum.DoctorPatients.name,
      ) { backStackEntry ->
        // reset posisi screen
        ScreenToUp(navController, PMRScreenEnum.DoctorPatients.name)

        DoctorPatientsScreen(
          navController,
          metaMaskViewModel,
          pmrViewModel,
          snackbarHost = snackbarHostState,
        )
      }

      // DoctorHealthRecordsScreen
      composable(
        route = "${PMRScreenEnum.DoctorHealthRecords.name}/{patientAddress}",
        arguments = listOf(navArgument("patientAddress") { type = NavType.StringType })
      ) { backStackEntry ->
        val patientAddress = backStackEntry.arguments?.getString("patientAddress") ?: ""

        if (patientAddress.isBlank()) {
          navController.navigate(PMRScreenEnum.DoctorHealthRecords.name)
          return@composable // 🔥 Stop eksekusi di sini
        }

        DoctorHealthRecordsScreen(
          navController,
          metaMaskViewModel,
          pmrViewModel,
          snackbarHost = snackbarHostState,
          patientAddress = patientAddress
        )
      }

      // Add Health Record
      composable(
        route = PMRScreenEnum.PatientAddHealthRecord.name,
      ) { backStackEntry ->
        // reset posisi screen
        ScreenToUp(navController, PMRScreenEnum.PatientAddHealthRecord.name)

        val uiStateMetaMask by metaMaskViewModel.uiState.collectAsState()

        val ethAddress = uiStateMetaMask.ethAddress
        if (ethAddress == null) {
          navController.navigate(PMRScreenEnum.Welcome.name)
          return@composable
        }

        AddHealthRecordScreen(
          navController,
          metaMaskViewModel,
          pmrViewModel,
          snackbarHost = snackbarHostState,
          patientAddress = ethAddress
        )
      }

      // DoctorAddHealthRecordScreen
      composable(
        route = "${PMRScreenEnum.AddHealthRecord.name}/{patientAddress}",
        arguments = listOf(navArgument("patientAddress") { type = NavType.StringType })
      ) { backStackEntry ->
        val patientAddress = backStackEntry.arguments?.getString("patientAddress") ?: ""

        if (patientAddress.isBlank()) {
          navController.navigate(PMRScreenEnum.Home.name)
          return@composable // 🔥 Stop eksekusi di sini
        }

        AddHealthRecordScreen(
          navController,
          metaMaskViewModel,
          pmrViewModel,
          snackbarHost = snackbarHostState,
          patientAddress = patientAddress
        )
      }

      // DoctorDetailHealthRecord
      composable(
        route = "${PMRScreenEnum.DetailHealthRecord.name}/{healthRecordId}/{patientAddress}",
        arguments = listOf(
          navArgument("healthRecordId") { type = NavType.StringType },
          navArgument("patientAddress") { type = NavType.StringType }
        )
      ) { backStackEntry ->
        val healthRecordId = backStackEntry.arguments?.getString("healthRecordId").orEmpty()
        val patientAddress = backStackEntry.arguments?.getString("patientAddress").orEmpty()

        if (patientAddress.isBlank() || healthRecordId.isBlank()) {
          navController.navigate(PMRScreenEnum.Home.name) {
            popUpTo(PMRScreenEnum.DetailHealthRecord.name) { inclusive = true }
          }
          return@composable
        }

        DetailHealthRecordScreen(
          navController = navController,
          metaMaskViewModel = metaMaskViewModel,
          pmrViewModel = pmrViewModel,
          snackbarHost = snackbarHostState,
          healthRecordId = healthRecordId,
          patientAddress = patientAddress
        )
      }

      // DoctorDetailHealthRecord
      composable(
        route = "${PMRScreenEnum.UpdateHealthRecord.name}/{healthRecordId}/{patientAddress}",
        arguments = listOf(
          navArgument("healthRecordId") { type = NavType.StringType },
          navArgument("patientAddress") { type = NavType.StringType }
        )
      ) { backStackEntry ->
        val healthRecordId = backStackEntry.arguments?.getString("healthRecordId").orEmpty()
        val patientAddress = backStackEntry.arguments?.getString("patientAddress").orEmpty()

        if (patientAddress.isBlank() || healthRecordId.isBlank()) {
          navController.navigate(PMRScreenEnum.Home.name) {
            popUpTo(PMRScreenEnum.DetailHealthRecord.name) { inclusive = true }
          }
          return@composable
        }

        UpdateHealthRecordScreen(
          navController = navController,
          metaMaskViewModel = metaMaskViewModel,
          pmrViewModel = pmrViewModel,
          snackbarHost = snackbarHostState,
          patientAddress = patientAddress,
          healthRecordId = healthRecordId
        )
      }

      // end
    }
  }
}

@Composable
private fun ScreenToUp(navController: NavHostController, routeName: String){
  // Hapus semua isi backstack kecuali halaman saat ini
  LaunchedEffect(Unit) {
    // jalankan ketika bukan stack terakhir
    if (navController.previousBackStackEntry != null) {
      navController.navigate(routeName) {
        popUpTo(0) { inclusive = true }
        launchSingleTop = true
      }
    }
  }
}