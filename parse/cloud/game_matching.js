// === Model classes and keys ===

var _gameClassName = "Game";
var _gameLockKey = "lock";
var _gameLockKeyInitial = 1;
var _gameLockKeyMax = 4;
var _gamePlayer1Key = "player_1";
var _gamePlayer2Key = "player_2";
var _gamePlayer3Key = "player_3";
var _gamePlayer4Key = "player_4";
var _gameStatusKey = "state";
var _gameStatusKeyWaiting = 0;
var _gameStatusKeyInProgress = 1;
var _gameStatusKeyFinished = 2;
var _gameStatusKeyCancelled = 0;
var _gameTurnKey = "playerTurn";
var _gamePlayersKey = "players";
var _gameAiCountKey = "aiCount";

var Game = Parse.Object.extend(_gameClassName);

// === Overridable methods ===
// TODO all these
exports.initialize = function() {};
exports.beforeMatchCreated = function() {};
exports.afterMatchCreated = function() {};
exports.beforeMatchJoined = function() {};
exports.afterMatchJoined = function() {};
exports.beforeTurnChange = function() {};
exports.afterTurnChange = function() {};

// === API methods ===

exports.joinAnonymousGame = function(player, options) {
    _log("Joining anonymous game", player);
    // Find number of available games
    var gameQuery = new Parse.Query(Game);
    gameQuery.equalTo(_gameStatusKey, _gameStatusKeyWaiting);
    gameQuery.notEqualTo(_gamePlayer1Key, player);
    gameQuery.notEqualTo(_gamePlayer2Key, player);
    gameQuery.notEqualTo(_gamePlayer3Key, player);
    gameQuery.notEqualTo(_gamePlayer4Key, player);
    gameQuery.count({
        success: function(count) {
            _log("Found " + count + " available games: ", player);
            if (count > 0) {
                // If matches were found, fetch random one
                var row = Math.floor(Math.random() * count);
                gameQuery.limit(1);
                gameQuery.skip(row); // random num is 0 to count-1 so we can use it as skip directly
                gameQuery.find({
                    success: function(results) {
                        _log("Fetched random game: " + JSON.stringify(results[0]), player);
                        if (results.length > 0) {
                            // Attempt to join fetched game
                            _log("Attempting to join game: " + JSON.stringify(results[0]), player);
                            _joinMatchAttempt(results[0], player, options);
                        } else {
                            // If something happened to the match give up and create a new one
                            _log("Creating new game since random selection not found", player);
                            _createNewMatch(player, options);
                        }
                    },
                    error: options.error
                });
            } else {
                // If no matches were found, create new one
                _log("Creating new game since no available games were found", player);
                _createNewMatch(player, options);
            }
        },
        error: options.error
    });
};


// === Core methods ===

_joinMatchAttempt = function(game, player, options) {
    // get random match returned
    game.increment(_gameLockKey);
    game.save(null, {
        success: function(updatedMatch) {
            _log("Incremented lock, game data is now: " + JSON.stringify(updatedMatch), player);
            // Check if the join succeeded
            if (updatedMatch.get(_gameLockKey) <= _gameLockKeyMax) {
                _log("Game lock successful, joining game.", player);
                if (!game.get(_gamePlayer2Key)) {
                    game.set(_gamePlayer2Key, playersNow);
                } else {
                    if (!game.get(_gamePlayer3Key)) {
                        game.set(_gamePlayer3Key, playersNow);
                    } else {
                        if (!game.get(_gamePlayer4Key)) {
                            game.set(_gamePlayer4Key, playersNow);
                        }
                        else {
                            _log("Unable to join a game", player);
                        }
                    }
                }
                if (playersNow.length == 4)
                    game.set(_gameStatusKey, _gameStatusKeyInProgress);
                game.save(null, {
                    success: function(newGame) {
                        // Return the game
                        //var isTurn = newMatch.get(_gameTurnKey) === _gameTurnKeyPlayer2;
                        //_log("Game joined, and it isTurn is : " + isTurn, player);
                        _log(JSON.stringify(newGame), player);
                        options.success(newGame);
                    },
                    error: options.error
                });
            } else {
                // If someone else joined game first, give up and create new one
                console.error("COLLISION");
                _log("Game lock failed, giving up and creating new game.", player);
                _createNewMatch(player, options);
            }
        },
        error: options.error
    });
};

_createNewMatch = function(player, options) {
    // Set new match attributes
    var game = new(Parse.Object.extend(_gameClassName))();
    game.set(_gameLockKey, _gameLockKeyInitial);
    game.set(_gameStatusKey, _gameStatusKeyWaiting); // wait for second player
    game.set(_gameTurnKey, player); // default challenger starts
    game.set(_gamePlayer1Key, player); // add the current player
    game.set(_gameAiCountKey, 0); // Must be 0 for a new Game

    _log("Creating new game with properties:", player);
    _log(JSON.stringify(game), player);
    _makeHands(player, game, options);
    // // Create match
    // game.save(null, {
    //     success: function(finalGame) {
    //         _log(JSON.stringify(game), player);
    //         options.success(game);
    //     },
    //     error: options.error
    // });
};

_log = function(message, player) {
    console.log(player.get("username") + "$ " + message);
};
