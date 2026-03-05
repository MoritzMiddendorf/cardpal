# Simple Webapp
# Allows authorized users to participate in cardgames
# Webapp will support multiple cardgames, so the infrastructure and codebase should represent that
# Multiple game rooms (= Multiple game sessions per server instance)
# Techstack (backend front language) is not decided yet
# Webapp will contain licensed cardgames so its important that only authorized users can join gamerooms
#Authentication Process: The admin of the server (Authentication of server admin is not decided yet) can initiate the server to start allowing gamerooms
# When the admin initiates the process, all previous OTPs/Initiations are invalidated
# When the admin initiates the process, a secure OTP is created that the admin can copy from somewhere (not decided yet)
# The OTP/Initiation is valid for 12 hours. After that, the server returns to its "idle" state until the admin initiates another process
# The Server Admin then shares the code with people who are allowed to play the game
# When a used successfully enters the OTP, he first has to enter a username (Max length 15 characters, no special characters). he can join existing gamerooms or join a new one
# Each gameroom has 2 states: IDLE (Waiting for players) and Playing,
# The "Idle" view simply shows all players and how many players the game needs
# Only the creator of the room can start the game (only when playercount matches game rules)
# The "Playing" View shows the playfield and all players on the side
# No password protection for gamerooms neccessary, but users cant join gamerooms that have started
# When the game concludes, the users are thrown back into the idle view
# No db/storage is neccessary at all. playsessions are not logged in any way.
# Only chromium browsers supported
# While not strictly prohibited, no extra support for mobile views (We expect a simple desktop view) 
# The cardgames itself should look simple, but small animations (for example for laying down a card) would be cool
# Playfield should support private cards (cards in hand only visible to the user), different playfield layouts, layered cards, flipped cards and everything else neccessary to support a wide range of cardgames
# To test the webapp, we will first add the classic and simple game blackjack
# The expected peak usercount is <10 (that part is very important, for now only friends will use the webapp) and we have to find a host for the server. Ideally,
since the demands are low and (almost?) no data persistence is needed, it should be free. 
