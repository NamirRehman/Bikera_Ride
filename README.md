# Bikera Mobile

A React Native mobile app for Bikera - track bike rides, earn rewards, compete with friends, and stake tokens.

## Features

- 🚴 **Ride Tracking**: GPS-powered bike ride tracking with real-time stats
- 👥 **Groups**: Join competitive ride pools with friends
- 🏆 **Leaderboard**: Compete globally and see rankings
- 💰 **Staking**: Stake iMERA tokens for rewards
- 🌉 **Bridge**: Transfer tokens between ICP and Solana
- 👥 **Friends**: Connect and compete with other riders
- 📊 **Analytics**: Detailed ride history and statistics
- 🌙 **Dark Mode**: Automatic theme switching

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- For Android: Android Studio or Android SDK
- For iOS: macOS with Xcode (optional)

### Installation

1. Install dependencies:
```bash
cd bikera_mobile
npm install
```

2. Install EAS CLI for builds (optional):
```bash
npm install -g eas-cli
```

### Running the App

#### Development Mode (Expo Go)

```bash
# Start development server
npm start

# Or directly for specific platform
npm run android    # Android
npm run ios        # iOS (macOS only)
npm run web        # Web browser
```

This will start the Expo development server. Use:
- **Expo Go app** on your phone to scan QR code
- **Android Emulator** or **iOS Simulator**
- **Web browser** for web version

#### Native Builds (Production)

For production builds, use EAS Build:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project (first time only)
eas build:configure

# Build for development (with dev client)
eas build --profile development --platform android
eas build --profile development --platform ios

# Build for preview (internal testing)
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Build for production
eas build --profile production --platform android
eas build --profile production --platform ios
```

### App Structure

```
src/
├── components/          # Reusable UI components
│   ├── BikeraBackground.tsx
│   ├── Card.tsx
│   ├── PrimaryButton.tsx
│   ├── Screen.tsx
│   └── SectionHeader.tsx
├── contexts/            # React contexts
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── navigation/          # Navigation configuration
│   ├── RootNavigator.tsx
│   ├── AppTabs.tsx
│   └── types.ts
├── screens/             # App screens
│   ├── LandingScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── TrackScreen.tsx
│   ├── GroupsScreen.tsx
│   ├── HistoryScreen.tsx
│   ├── LeaderboardScreen.tsx
│   ├── FriendsScreen.tsx
│   ├── BridgeScreen.tsx
│   ├── StakingScreen.tsx
│   └── ProfileScreen.tsx
├── theme/               # Theming
│   ├── ThemeContext.tsx
│   └── tokens.ts
└── styles.css           # Global styles
```

### Platform-Specific Setup

#### Android

1. Install Android Studio
2. Set up Android SDK (API 34+ recommended)
3. Create AVD (Android Virtual Device) or use physical device
4. Enable USB debugging for physical devices

#### iOS (macOS only)

1. Install Xcode 13.4+
2. Install iOS Simulator
3. Set up development certificates (for physical devices)

#### Web

1. No additional setup required
2. Runs in any modern web browser
3. GPS/location features may be limited in web version

### Permissions

The app requires the following permissions:

- **Location**: For GPS ride tracking and route validation
- **Camera**: For profile pictures and ride validation photos
- **Storage**: To save ride data and cache images
- **Notifications**: For ride reminders and achievement alerts

### Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_API_URL=https://your-api-endpoint.com
EXPO_PUBLIC_ICP_CANISTER_ID=your-canister-id
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Testing

#### Running Tests

```bash
npm test
```

#### E2E Testing (Future)

```bash
npm run test:e2e
```

### Deployment

#### EAS Submit (App Stores)

After building production apps:

```bash
# Submit to Google Play
eas submit --platform android

# Submit to App Store (requires Apple Developer account)
eas submit --platform ios
```

### Troubleshooting

#### Common Issues

1. **Metro bundler issues**:
   ```bash
   npm start --clear
   ```

2. **Android build fails**:
   - Ensure Android SDK is properly configured
   - Check that `android/` folder exists (run `expo prebuild`)

3. **iOS build fails**:
   - Ensure Xcode is installed and configured
   - Check iOS Simulator is available

4. **Location permissions**:
   - Grant location permissions in device settings
   - For Android, enable "Allow all the time" for background tracking

#### Clearing Cache

```bash
# Clear Expo cache
expo start --clear

# Clear npm cache
npm cache clean --force

# Clear Metro bundler cache
npx react-native start --reset-cache
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

### License

This project is licensed under the MIT License.

### Support

For support, please contact the development team or create an issue in the repository.
