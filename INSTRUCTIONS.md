Build a website titled "Homonormative Chess" (subtitle: "Where every ruler has an equal") where users can play either a modified version of Double Kings Chess or a modified version of Double Queens Chess over the internet (users create a game code and share it with their friends to play) or over the board (the board just flips each turn).

## Modified version of Double Kings Chess rules

Same as regular chess except for the following differences:

- Each player has two kings.
- Neither king can move into check, and at the end of each turn both must escape check.
- If it is impossible to save both of them at once, it is a checkmate and that player loses the game.
- That means that one can win by either checkmating one king, checkmating the other king, or attacking the two kings at once such that both cannot be saved (i.e., a fork).
- Castling works with any of the kings in the same way. Both kings can castle in either direction, with the usual exceptions:
  - The king cannot castle out of, into, or through check.
  - Neither the rook nor king undergoing the castle can have been moved or captured.
  - There must not be any pieces between the king and the rook.
- Pawns can also promote to king, and the check-rule applies also to the new kings.

## Modified version of Double Queens Chess rules

Same as regular chess except for the following differences:

- Each player has two queens.
- Neither queen can move into check, and at the end of each turn both must escape check.
- If it is impossible to save both of them at once, it is a checkmate and that player loses the game.
- That means that one can win by either checkmating one queen, checkmating the other queen, or attacking the two queens at once such that both cannot be saved (i.e., a fork).
- Castling works with queens instead of kings. Both queens can castle in either direction, with the usual exceptions:
  - The queen cannot castle out of, into, or through check.
  - Neither the rook nor queen undergoing the castle can have been moved or captured.
  - There must not be any pieces between the queen and the rook.
- Pawns can also promote to queen, and the check-rule applies also to the new queens.
- Pawns can also promote to king, and they are just regular pieces. If it is captured, the game continues.


## Extra notes:

- The main page has a title "Homonormative Chess" (subtitle: "Where every ruler has an equal") and text below saying "Choose Your Variant" with two buttons: "Double Kings" and "Double Queens".
- The --font-display (which includes the title, among other things) should be Cinzel.
- The title should be --gold, which is #D4AF37.
- The title should have `text-shadow: 2px 2px 0 var(--burgundy), 4px 4px 0 var(--burgundy-dark), 0 0 40px rgba(212, 175, 55, 0.3);` and be 4rem large.
- The subtitle should be --cream-dark (#E8DCC8) and in italics.
- The website should be responsive and look good on mobile, tablet, and desktop. It must look very good. It has got to combine a tasteful implementation of the regal and grand aesthetics and aura of chess with a modern website. It should not look like a cheesy or cheap website. It should be elegant and modern. However, it must not be minimalist and brutalist. It should feel human-y and warm.
- The default time should be 10 minutes (rapid).
- There are other presets:
  - rapid:
    - 30 minutes
    - 15 minutes with 10 seconds increment
    - 5 minutes
  - blitz:
    - 3 minutes with 2 seconds increment
    - 3 minutes
  - bullet:
    - 2 minutes with 1 second increment
    - 1 minute
- Note that for both variants:
  - There is a move list that shows the moves made in the game. It gets updated throughout the game as moves are made.
  - There is still en passant.
  - The 50 move rule still applies.
  - The threefold repetition rule still applies.
  - The "not enough material" rule still applies.
  - You can resign at any time.
  - If the user disconnects from the game, a timeout of 1 minute starts. If the user does not reconnect within 1 minute, the game is forfeited and the other player wins.
  - You can request a takeback at any time. The other player can accept or reject the takeback. If the other player accepts, the game will be reset to the position before the last move. If the other player rejects, the game will continue as normal. If the other player plays a move instead of choosing to accept or reject the takeback, the takeback is automatically rejected.
  - You can offer a draw at any time. The other player can accept or reject the draw. If the other player accepts, the game will end in a draw. If the other player rejects, the game will continue as normal. If the other player plays a move instead of choosing to accept or reject the draw, the draw is automatically rejected.
  - There should be a timer that counts down the time each player has to move. You should be able to see your own time and the time of the other player. The timers are color-coded.

## Non-functional requirements

- Use Bun for the backend.