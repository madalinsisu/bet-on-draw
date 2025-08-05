# ⚽ Soccer Bet Tracker

A mobile-optimized web application for tracking soccer game bets and results. Built specifically for iPhone 15 Pro and other mobile devices.

## Features

### 📱 Mobile-First Design
- Optimized for iPhone 15 Pro (430px width)
- Touch-friendly interface with proper button sizes
- Responsive design that works on all mobile devices
- Safe area support for iPhone notch

### 🎯 Core Functionality
- **Add Games**: Create new soccer game entries with home/away teams
- **Place Bets**: Set bet amounts and bet types (Home Win, Away Win, Draw)
- **Track Results**: Update game results and see win/loss outcomes
- **Statistics**: View your betting performance with detailed stats
- **Local Storage**: All data persists locally in your browser

### 📊 Statistics Dashboard
- Total number of bets placed
- Win rate percentage
- Total wins and losses
- Total amount bet
- Net profit/loss calculation

### 🎨 Modern UI/UX
- Beautiful gradient design
- Smooth animations and transitions
- Intuitive card-based layout
- Color-coded status indicators
- Toast notifications for user feedback

## How to Use

### 1. Adding a New Game
1. Fill in the **Home Team** name
2. Fill in the **Away Team** name
3. Enter your **Bet Amount** (in dollars)
4. Select your **Bet Type**:
   - Home Win: You bet the home team will win
   - Away Win: You bet the away team will win
   - Draw: You bet the game will end in a draw
5. Click "Add Game"

### 2. Updating Game Results
1. Find the game in your list
2. Click "Update Result" (or "Change Result" if already set)
3. Select the actual game outcome:
   - Home Win: Home team won
   - Away Win: Away team won
   - Draw: Game ended in a draw
4. Click "Save Result"

### 3. Understanding Results
- **Pending**: Game added but result not yet set
- **WIN**: Your bet matched the actual result (green)
- **LOSS**: Your bet didn't match the actual result (red)

### 4. Managing Games
- **Delete**: Remove games you no longer want to track
- **Change Result**: Modify results if you made an error
- **View Stats**: See your overall betting performance

## Technical Details

### Browser Compatibility
- Works on all modern browsers
- Requires JavaScript enabled
- Uses Local Storage for data persistence

### Data Storage
- All data is stored locally in your browser
- No server or internet connection required
- Data persists between browser sessions
- Data is tied to your specific browser/device

### File Structure
```
├── index.html      # Main HTML structure
├── styles.css      # Mobile-optimized CSS styles
├── script.js       # JavaScript functionality
└── README.md       # This documentation
```

## Getting Started

1. **Download/Clone** the files to your computer
2. **Open** `index.html` in your web browser
3. **Start Adding Games** and tracking your bets!

### For iPhone Users
1. Open the web app in Safari
2. Tap the share button (square with arrow)
3. Select "Add to Home Screen"
4. The app will now work like a native app

## Privacy & Security

- **No Data Collection**: All data stays on your device
- **No Tracking**: No analytics or user tracking
- **Local Only**: No internet connection required after initial load
- **Secure**: Uses browser's built-in security features

## Customization

The app is built with vanilla HTML, CSS, and JavaScript, making it easy to customize:

- **Colors**: Modify the CSS variables in `styles.css`
- **Layout**: Adjust the grid and flexbox properties
- **Features**: Add new functionality in `script.js`

## Support

This is a standalone web application that doesn't require any external dependencies or setup. Simply open the HTML file in any modern web browser to start using it.

---

**Note**: This application is for entertainment and personal tracking purposes only. Please gamble responsibly and within your means. 