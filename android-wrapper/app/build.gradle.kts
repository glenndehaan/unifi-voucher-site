plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.unifi.voucher"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.unifi.voucher"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // NDK ABI filters for nodejs-mobile
        ndk {
            abiFilters += listOf("armeabi-v7a", "arm64-v8a", "x86", "x86_64")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    // nodejs-mobile: Copy native libraries
    sourceSets {
        getByName("main") {
            jniLibs.srcDirs("src/main/jniLibs")
            assets.srcDirs("src/main/assets")
        }
    }

    // Exclude duplicate files
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "META-INF/DEPENDENCIES"
        }
        jniLibs {
            useLegacyPackaging = true
        }
    }
}

dependencies {
    // AndroidX Core
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.activity:activity-ktx:1.8.2")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-service:2.7.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")

    // WebView
    implementation("androidx.webkit:webkit:1.9.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // JSON
    implementation("com.google.code.gson:gson:2.10.1")

    // Node.js runtime for Android
    // Option 1: nodejs-mobile (recommended)
    //   - Download from: https://github.com/nickolee/nickolee-mobile-android/releases
    //   - Copy libnode.so to app/src/main/jniLibs/{abi}/
    //   - Add the nodejs-mobile-android AAR to libs/
    // Option 2: Use the app with external server (set SERVER_URL in MainActivity)
    //
    // Uncomment when nodejs-mobile is integrated:
    // implementation(files("libs/nodejs-mobile-android.aar"))

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}

// Task to copy nodejs project to assets before build
tasks.register<Copy>("copyNodeJsProject") {
    from("${project.rootDir}/nodejs-assets/nodejs-project")
    into("${projectDir}/src/main/assets/nodejs-project")

    doFirst {
        println("Copying Node.js project to assets...")
    }
}

tasks.named("preBuild") {
    dependsOn("copyNodeJsProject")
}
