# GURPS Roll Stats

A comprehensive Foundry VTT module for collecting, analyzing, and visualizing 3d6 roll statistics in GURPS games, featuring an innovative "On Fire" effect system.


## Index

1. [Features](#features)  
   1.1 [Statistical Analysis](#statistical-analysis)  
   1.2 ["On Fire" Effect System](#on-fire-effect-system)  
   1.3 [Data Export](#data-export)  

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

7. [Data Export](#data-export)  
   7.1 [Chart Export](#chart-export)  
   7.2 [Supported Formats](#supported-formats)  

8. [Supported Roll Formats](#supported-roll-formats)  

9. [Technical Requirements](#technical-requirements)  
   9.1 [Dependencies](#dependencies)  
   9.2 [Compatibility](#compatibility)  

10. [Themes](#themes)  
    10.1 [Fire Theme](#fire-theme)  
    10.2 [Electric Theme](#electric-theme)  

11. [Best Practices](#best-practices)  
    11.1 [For GMs](#for-gms)  
    11.2 [For Players](#for-players)  

12. [Troubleshooting](#troubleshooting)  
    12.1 [Common Issues](#common-issues)  
    12.2 [Performance Tips](#performance-tips)  

13. [Data Management](#data-management)  
    13.1 [Resetting Data](#resetting-data)  
    13.2 [Data Persistence](#data-persistence)  

14. [Advanced Features](#advanced-features)  
    14.1 [Multi-User Synchronization](#multi-user-synchronization)  
    14.2 [Responsive Design](#responsive-design)  

15. [Support](#support)  

16. [License](#license)  

17. [Thanks](#thanks)  

## Features

### Statistical Analysis
- **Automatic Roll Detection**: Captures all basic 3d6 rolls from GGA
- **Comprehensive Statistics**: Success rates, failure rates, critical outcomes, and margin analysis
- **Visual Charts**: Interactive distribution charts showing roll patterns
- **Player Comparisons**: Compare individual performance against global averages
- **Rankings System**: Automated rankings for luckiest, unluckiest, and most successful players

### "On Fire" Effect System
- **Dynamic Visual Effects**: Fire or electric themes with particle animations
- **Progressive Counter System**: Build up effect counters with successful rolls
- **Critical Success Rewards**: Instant activation on critical successes
- **Failure Penalties**: Smart penalty system based on current status *(soon)*
- **Customizable Themes**: Choose between Fire 🔥 and Electric ⚡ effects

### Data Export
- **PNG Chart Export**: Save distribution charts as high-quality images
- **Multiple View Modes**: Individual player or comparative multi-player charts
- **Complete Report in a Journal**: Table to save rolls per session and compare results

## Quick Start Guide

### Basic Usage
1. **Enable the Module**: The module starts recording automatically when enabled
2. **Choose Your Settings**: Decide whether to display effects, counters, or buttons
3. **Make 3d6 Rolls**: Any GURPS 3d6 roll with success/failure information is tracked
4. **View Statistics**: Click the chart icon in chat controls to see your stats
5. **Check Rankings**: Use the "Show Rankings" button to see player comparisons

### Chat Commands
| Command | Description |
|---------|-------------|
| `/stats` | Open the statistics dialog |
| `/stats reset` | Clear all recorded statistics (GM only) |

### Chat Controls
The module adds two buttons to your chat interface:
- **Statistics Button**: Opens the main statistics dialog
- **Recording Toggle**:
  - **GM**: Controls global recording (all players)
  - **Players**: Controls personal recording (when global is enabled)
> Can be disabled in settings

## Statistics Dialog

### Individual Player View
When viewing a specific player's statistics, you'll see:
- **Basic Metrics**: Total rolls, average roll, success/failure rates
- **Margin Analysis**: Average success and failure margins
- **Critical Outcomes**: Count of critical successes and failures
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

### Using Rankings
1. Click the **Statistics** button
2. Select **"Show Rankings"**
3. View the 2x2 grid of top performers
4. Click **"Print Ranking to Chat"** to share complete rankings with all players

## "On Fire" Effect System

### How It Works
The "On Fire" system tracks your roll performance and provides visual feedback:
1. **Success**: +1 fire icon 🔥
2. **Failure**: -1 fire icon (or -7 if currently "on fire")
3. **Critical Success**: Instantly become "on fire" (10 icons)
4. **Critical Failure**: Lose all fire icons

> In the future, you'll be able to choose the on-fire value, and the effect will be progressive.

### Visual Effects
When a player reaches 10 fire icons, they become "ON FIRE" with:
- **Animated borders** around their chat messages
- **Particle effects** (fire or electric based on theme)
- **Special notifications** announcing their status *(this isn't working right now and is annoying)*
- **Emoji counters** showing current fire level

### Customization Options

#### GM Settings (Global)
- **Enable Counter (GM)**: Turn the entire system on/off
- **Enable Animation Effects (GM)**: Control visual animations globally
- **Effect Theme**: Choose between Fire 🔥 or Electric ⚡ themes

#### Player Settings (Individual)
- **Show Counters**: Display fire icons on your messages
- **Show Animation Effects**: Enable visual effects for yourself
- **Show Chat Controls**: Display statistics and recording buttons
- **Hide Effect Emojis**: Hide emojis while keeping the system active
- **Pause My Rolls**: Temporarily stop recording your rolls

## Configuration

### GM Configuration
Access settings through Foundry's module settings:
1. **Display Options**
   - Hide GM Data: Exclude GM rolls from statistics
   - Allow Players Access: Let players view the module
2. **Effect System**
   - Enable Counter (GM): Global toggle for the fire system
   - Enable Animation Effects (GM): Global toggle for animations
   - Effect Theme: Choose Fire or Electric theme

### Player Configuration
Players can customize their experience:
1. **Personal Display**
   - Show Counters: Display fire icons on messages
   - Show Animation Effects: Enable visual effects
   - Show Chat Controls: Display interface buttons
   - Hide Effect Emojis: Hide emojis but keep counting
2. **Recording Control**
   - Pause My Rolls: Stop recording temporarily

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

### Standard Foundry Rolls
- Rolls with success/failure indicators
- Rolls with margin information

### GURPS Game Aid (GGA) Format
```
Rolled (4,2,1) = 7
Made it by 3 - Success!
``` 


### Margin Formats
- "Made it by X" / "Missed it by X"
- "MoS: X" / "MoF: X" (Margin of Success/Failure)
- "Success!" / "Failure!" indicators

## Technical Requirements

### Dependencies
- **Foundry VTT**: Version 13+
- **SocketLib**: Required for multi-user effect synchronization

### Compatibility
- **GURPS System**: Optimized for GURPS GGA
- **Other Systems**: Does not work, and I have no plans to support them.

## Themes

### Fire Theme
- **Colors**: Warm reds, oranges, and yellows
- **Effects**: Floating ember particles
- **Animation**: Pulsing borders and particle trails
- **Message**: "Player is ON FIRE!"

### Electric Theme ⚡
- **Colors**: Cool blues, whites, and electric cyan
- **Effects**: Lightning bolts and electrical arcs
- **Animation**: Electric surges and border sparks
- **Message**: "Player is ELECTRIFIED!"

## Best Practices

### For GMs
1. **Enable globally** but let players control their individual experience
2. **Use rankings** to create engaging competition between players
3. **Export charts** to share session highlights
4. **Monitor the system** - critical failures reset fire status completely

### For Players
1. **Customize your display** preferences for optimal experience
2. **Use the pause feature** when making non-gameplay rolls
3. **Check your statistics** regularly to track improvement
4. **Celebrate on fire status** - it's designed to be exciting!

## Troubleshooting

### Common Issues
**Statistics not updating?**
- Check if recording is enabled (both globally and personally)
- Ensure rolls include success/failure information
- Verify the roll format is supported

**Effects not showing?**
- Check both GM global settings and your personal settings
- Both must be enabled for effects to display
- Try refreshing the page if effects seem stuck

**Charts not displaying?**
- Ensure you have roll data recorded
- Try selecting "All Players" if individual view is empty
- Check browser console for any errors

### Performance Tips
- **Large datasets**: The module handles thousands of rolls efficiently
- **Memory usage**: Charts are optimized and don't impact game performance
- **Network**: Effects use SocketLib for efficient synchronization

## Data Management

### Resetting Data
- Use `/stats reset` command (GM only)
- This clears all recorded statistics permanently
- Fire effect counters are also reset

### Data Persistence
- All data is stored in Foundry's world settings
- Data persists between sessions
- No external database required

## Advanced Features

### Multi-User Synchronization
- Real-time effect updates across all clients
- Synchronized fire status and animations
- Efficient network usage through SocketLib

### Responsive Design
- Charts adapt to different screen sizes
- Optimized for various Foundry themes

## Support
For issues, suggestions, or contributions:
- **GitHub**: [gurps-rolls-stats](https://github.com/Boifuba/gurps-rolls-stats)
- **Discord**: boifuba

## License
This module is provided as-is for the Foundry VTT community. Please respect the terms of use and contribute back to the community when possible.

---

## Thanks
Thanks to Tuvulu for the idea — at first, I had no intention of making it, but you won me over with persistence!

*"foo, bar and zip! Not baz!"*
