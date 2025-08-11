Hey! If you’re reading this, know that this is the first release for testing!  
There may be several bugs.

# Ideas and Notes

## To Do
- Validate with the user.
- Test in production.
- Add a setting for the GM to choose whether the button appears in the chat bar or in the actions bar (right side).  
  > I’ve added the appropriate checkboxes in the settings, but they don’t have any logic yet.

## Thinking About

- Decide if each player should be able to pause their own rolls during tests.  
  > My problem is that players are like the devil’s image — they can simply forget. The GM should be the one to observe whether logging is on or not.
- Add an “on fire” visual effect to the token or HUD, granting 10× successes for X minutes or 1 critical for X minutes, where X is configurable in Settings.  
  > Nothing on the canvas — that bothers me. The token idea could work; a simple effect under the token using PIXI might achieve this.
- Move the PNG export option to Settings.  
  > The button is already there; I just need to move the logic.
- Change each user’s color in the chart via Settings, or automatically use the color the user selected (currently unknown how to implement).  
  > Someone told me they did this and sent me their Git, but I haven’t even looked. It makes no sense to mess with this until we decide which chart to use, and in the end, it’s just aesthetics.
- Optimize vertical space to avoid the scroll bar.  
  > I changed this damn thing, but it’s still not the way I want.
