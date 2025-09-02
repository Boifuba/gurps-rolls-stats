[![Donate](https://img.shields.io/badge/Donate-Sponsor%20on%20GitHub-black?logo=github)](https://github.com/sponsors/Boifuba)
# GURPS Roll Stats

A comprehensive Foundry VTT module for collecting, analyzing, and visualizing 3d6 roll statistics in GURPS games, featuring an innovative "On Fire" effect system and attribute tracking.

## Index

1. [Features](#features)  
   1.1 [Statistical Analysis](#statistical-analysis)  
   1.2 ["On Fire" Effect System](#on-fire-effect-system)  
   1.3 [Attribute Tracking](#attribute-tracking)  
   1.4 [Data Export](#data-export)  

2. [Quick Start Guide](#quick-start-guide)  
   2.1 [Basic Usage](#basic-usage)  
   2.2 [Chat Commands](#chat-commands)  
   2.3 [Chat Controls](#chat-controls)  

3. [Statistics Dialog](#statistics-dialog)  
   3.1 [Individual Player View](#individual-player-view)  
   3.2 [All Players View](#all-players-view)  

4. [Rankings System](#rankings-system)  
   4.1 [Available Rankings](#available-rankings)  
   4.2 [Using Rankings](#using-rankings)  

5. ["On Fire" Effect System](#on-fire-effect-system)  
   5.1 [How It Works](#how-it-works)  
   5.2 [Visual Effects](#visual-effects)  
   5.3 [Customization Options](#customization-options)  
 
6. [Configuration](#configuration)  
   6.1 [GM Configuration](#gm-configuration)  
   6.2 [Player Configuration](#player-configuration)  

7. [Attribute Tracking](#attribute-tracking)  
   7.1 [HP Tracking](#hp-tracking)  
   7.2 [FP Tracking](#fp-tracking)  
   7.3 [Statistics Integration](#statistics-integration)  

8. [Data Export](#data-export)  
   8.1 [Chart Export](#chart-export)  
   8.2 [Supported Formats](#supported-formats)  

9. [Supported Roll Formats](#supported-roll-formats)  

10. [Technical Requirements](#technical-requirements)  
    10.1 [Dependencies](#dependencies)  
    10.2 [Compatibility](#compatibility)  

11. [Themes](#themes)  
    11.1 [Fire Theme](#fire-theme)  
    11.2 [Electric Theme](#electric-theme)  

12. [Best Practices](#best-practices)  
    12.1 [For GMs](#for-gms)  
    12.2 [For Players](#for-players)  

13. [Troubleshooting](#troubleshooting)  
    13.1 [Common Issues](#common-issues)  
    13.2 [Performance Tips](#performance-tips)  

14. [Data Management](#data-management)  
    14.1 [Resetting Data](#resetting-data)  
    14.2 [Data Persistence](#data-persistence)  

15. [Advanced Features](#advanced-features)  
    15.1 [Multi-User Synchronization](#multi-user-synchronization)  
    15.2 [Responsive Design](#responsive-design)  

16. [Support](#support)  

17. [License](#license)  

18. [Thanks](#thanks)  

## Features

### Statistical Analysis
- **Automatic Roll Detection**: Captures all basic 3d6 rolls from GURPS Game Aid (GGA)
- **Comprehensive Statistics**: Success rates, failure rates, critical outcomes, and margin analysis
- **Visual Charts**: Interactive distribution charts showing roll patterns
- **Player Comparisons**: Compare individual performance against global averages
- **Rankings System**: Automated rankings for luckiest, unluckiest, and most successful players
- **GM Data Filtering**: Option to hide GM data from statistics and rankings

### "On Fire" Effect System
- **Dynamic Visual Effects**: Fire or electric themes with particle animations
- **Progressive Counter System**: Build up effect counters with successful rolls (30-point system)
- **Critical Success Rewards**: Instant activation on critical successes
- **Failure Penalties**: Smart penalty system based on current status
- **Customizable Themes**: Choose between Fire 🔥 and Electric ⚡ effects
- **Personal Active Text**: Players can customize their "on fire" message

### Attribute Tracking
- **HP Damage Tracking**: Automatically logs damage taken by actors
- **FP Fatigue Tracking**: Monitors fatigue point expenditure
- **Integrated Statistics**: Damage and fatigue data included in player rankings
- **Real-time Monitoring**: Tracks changes as they happen during gameplay

### Data Export
- **PNG Chart Export**: Save distribution charts as high-quality images
- **Multiple View Modes**: Individual player or comparative multi-player charts
- **Complete Statistics**: Export comprehensive player performance data

## Quick Start Guide

### Basic Usage
1. **Enable the Module**: The module starts recording automatically when enabled
2. **Choose Your Settings**: Configure display preferences for effects, counters, and buttons
3. **Make 3d6 Rolls**: Any GURPS 3d6 roll with success/failure information is tracked
4. **View Statistics**: Click the chart icon in chat controls to see your stats
5. **Check Rankings**: Use the "Show Rankings" button to see player comparisons

### Chat Commands
| Command | Description |
|---------|-------------|
| `/stats` | Open the statistics dialog |
| `/stats reset` | Clear all recorded statistics (GM only) |
| `/stats settings` | Open the settings dialog |
| `/stats fullreset` | Complete module reset (GM only) |

### Chat Controls
The module adds two buttons to your chat interface:
- **Statistics Button**: Opens the main statistics dialog
- **Recording Toggle**:
  - **GM**: Controls global recording (all players)
  - **Players**: Controls personal recording (when global is enabled)

> Chat controls can be disabled in player settings

## Statistics Dialog

### Individual Player View
When viewing a specific player's statistics, you'll see:
- **Basic Metrics**: Total rolls, average roll, success/failure rates
- **Margin Analysis**: Average success and failure margins
- **Critical Outcomes**: Count of critical successes and failures
- **Attribute Data**: Total damage taken and fatigue spent
- **Distribution Chart**: Visual representation of roll distribution
- **Comparison Indicators**: How the player compares to global averages (▲▼)

### All Players View
Shows combined statistics from all players with multi-series charts comparing different players' roll distributions.

## Rankings System

### Available Rankings
1. **Luckiest Players**: Most critical successes
2. **Unluckiest Players**: Most critical failures
3. **Best Success Rate**: Highest percentage of successful rolls
4. **Worst Success Rate**: Highest percentage of failed rolls
5. **Most Damage Taken**: Highest total HP damage received
6. **Most Fatigue Spent**: Highest total FP expenditure

### Using Rankings
1. Click the **Statistics** button
2. Select **"Show Rankings"**
3. View the 2x3 grid of top performers
4. Click **"Print Ranking to Chat"** to share complete rankings with all players

## "On Fire" Effect System

### How It Works
The "On Fire" system uses a 30-point progression system:
- **Success**: +1 point
- **Failure**: -1 point (or -21 points if currently "on fire")
- **Critical Success**: Instantly become "on fire" (30 points)
- **Critical Failure**: Lose all points

The visual counter shows 0-10 icons representing your progress (every 3 points = 1 icon).

### Visual Effects
When a player reaches 30 points (10 icons), they become "ON FIRE" with:
- **Animated borders** around their chat messages
- **Particle effects** (fire or electric based on theme)
- **Special notifications** announcing their status
- **Emoji counters** showing current level
- **Custom active text** in their name display

### Customization Options

#### GM Settings (Global)
- **Enable Counter (GM)**: Turn the entire system on/off
- **Enable Animation Effects (GM)**: Control visual animations globally
- **Effect Theme**: Choose between Fire 🔥 or Electric ⚡ themes
- **Full Bar Maximum Points**: Configure the point system (10-100 points)
- **Global Active Text**: Default message for players who haven't set their own

#### Player Settings (Individual)
- **Show Counters**: Display effect icons on your messages
- **Show Animation Effects**: Enable visual effects for yourself
- **Show Chat Controls**: Display statistics and recording buttons
- **Hide Effect Emojis**: Hide emojis while keeping the system active
- **My Personal Active Text**: Custom message when you're "on fire"
- **Pause My Rolls**: Temporarily stop recording your rolls

## Configuration

### GM Configuration
Access settings through Foundry's module settings:

1. **Display Options**
   - **Hide GM Data**: Exclude GM rolls and actor data from statistics and rankings
   - **Allow Players Access**: Let players view the module

2. **Recording Control**
   - **Global Recording Active**: Master switch for all roll recording

3. **Effect System**
   - **Enable Counter (GM)**: Global toggle for the effect system
   - **Enable Animation Effects (GM)**: Global toggle for animations
   - **Effect Theme**: Choose Fire or Electric theme
   - **Full Bar Maximum Points**: Configure point system (default: 30)
   - **Global Active Text**: Default active message template

### Player Configuration
Players can customize their experience through module settings:

1. **Personal Display**
   - **Show Counters**: Display effect icons on messages
   - **Show Animation Effects**: Enable visual effects
   - **Show Chat Controls**: Display interface buttons
   - **Hide Effect Emojis**: Hide emojis but keep counting

2. **Personal Customization**
   - **My Personal Active Text**: Custom "on fire" message
   - **Pause My Rolls**: Stop recording temporarily

## Attribute Tracking

### HP Tracking
- **Automatic Detection**: Monitors HP decreases on all actors
- **Damage Logging**: Records damage taken, before/after values, and who made the change
- **Real-time Updates**: Integrates with statistics immediately

### FP Tracking
- **Fatigue Monitoring**: Tracks FP decreases automatically
- **Usage Logging**: Records fatigue spent with full context
- **Player Attribution**: Links fatigue usage to actor owners

### Statistics Integration
- **Ranking Categories**: "Most Damage Taken" and "Most Fatigue Spent" rankings
- **Individual Stats**: Damage and fatigue totals in player statistics
- **Comparative Analysis**: Compare your damage/fatigue against other players

## Data Export

### Chart Export
1. Open the Statistics dialog
2. The chart displays automatically
3. Use the module's export function to save as PNG
4. Charts include proper legends and are optimized for sharing

### Supported Formats
- **PNG Images**: High-quality charts suitable for sharing
- **Interactive Charts**: Real-time updates as new rolls are recorded

## Supported Roll Formats

### GURPS Game Aid (GGA) Format
The module uses `GURPS.lastTargetedRoll` object for accurate roll detection:
- Automatic detection of 3d6 rolls
- Success/failure status from GURPS system
- Margin of success/failure extraction
- Critical success/failure identification

### Roll Requirements
- Must be 3d6 rolls processed by GURPS system
- Must include success/failure determination
- Margin information is automatically extracted when available

## Technical Requirements

### Dependencies
- **Foundry VTT**: Version 13+
- **SocketLib**: Required for multi-user effect synchronization
- **GURPS Game Aid**: Required for roll detection and parsing

### Compatibility
- **GURPS System**: Optimized for GURPS Game Aid (GGA)
- **Other Systems**: Not supported - designed specifically for GURPS

## Themes

### Fire Theme 🔥
- **Colors**: Warm reds, oranges, and yellows
- **Effects**: Floating ember particles with bouncing counters
- **Animation**: Pulsing borders and particle trails
- **Message**: "Player is ON FIRE!"

### Electric Theme ⚡
- **Colors**: Cool blues, whites, and electric cyan
- **Effects**: Lightning bolts and electrical arcs
- **Animation**: Electric surges and border sparks
- **Message**: "Player is ELECTRIFIED!"

## Best Practices

### For GMs
1. **Configure globally** but let players control their individual experience
2. **Use "Hide GM Data"** to focus statistics on player performance
3. **Monitor attribute tracking** to see damage and fatigue patterns
4. **Use rankings** to create engaging competition between players
5. **Export charts** to share session highlights

### For Players
1. **Customize your display** preferences for optimal experience
2. **Set personal active text** to make your "on fire" status unique
3. **Use the pause feature** when making non-gameplay rolls
4. **Check your statistics** regularly to track improvement
5. **Monitor your damage/fatigue** to see gameplay patterns

## Troubleshooting

### Common Issues

**Statistics not updating?**
- Check if recording is enabled (both globally and personally)
- Ensure rolls include success/failure information
- Verify the roll format is supported by GURPS Game Aid

**Effects not showing?**
- Check both GM global settings and your personal settings
- Both must be enabled for effects to display
- Try refreshing the page if effects seem stuck

**Charts not displaying?**
- Ensure you have roll data recorded
- Try selecting "All Players" if individual view is empty
- Check if "Hide GM Data" is filtering out all available data
- Check browser console for any errors

**Attribute tracking not working?**
- Verify that HP/FP changes are being made through the character sheet
- Check that the changes result in actual decreases (damage/fatigue)
- Ensure SocketLib is properly installed and active

### Performance Tips
- **Large datasets**: The module handles thousands of rolls efficiently
- **Memory usage**: Charts are optimized and don't impact game performance
- **Network**: Effects use SocketLib for efficient synchronization
- **Attribute tracking**: Uses efficient hooks to minimize performance impact

## Data Management

### Resetting Data
- **`/stats reset`**: Clear roll statistics only (GM only)
- **`/stats fullreset`**: Complete module reset including effects and settings (GM only)
- **Individual clearing**: Use settings to clear specific user effects

### Data Persistence
- All data is stored in Foundry's world settings
- Data persists between sessions
- No external database required
- Automatic cleanup of corrupted data on startup

## Advanced Features

### Multi-User Synchronization
- Real-time effect updates across all clients
- Synchronized fire status and animations
- Efficient network usage through SocketLib
- Immediate visual feedback on critical successes

### Responsive Design
- Charts adapt to different screen sizes
- Optimized for various Foundry themes
- Mobile-friendly interface elements

### Data Integrity
- Automatic validation of roll data
- Corruption detection and cleanup
- Safe migration between data formats
- Robust error handling

## Support

For issues, suggestions, or contributions:
- **GitHub**: [gurps-rolls-stats](https://github.com/Boifuba/gurps-rolls-stats)
- **Discord**: boifuba

## License

This module is provided as-is for the Foundry VTT community. Please respect the terms of use and contribute back to the community when possible.

---

## Thanks

Thanks to Tuvulu for the idea — at first, I had no intention of making it, but you won me over with persistence!

*"May your rolls be ever in your favor!"*


<p align="center">
  <a href="https://github.com/sponsors/Boifuba">
    <img src="https://img.shields.io/badge/Sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#white)](https://github.com/sponsors/Boifuba" width="200" alt="Apoie este projeto"/>
  </a>
</p>
