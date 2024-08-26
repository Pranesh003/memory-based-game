import React, { useReducer, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

// Emoji symbols for cards
const cardImages = [
  { id: 1, symbol: '🐶' },
  { id: 2, symbol: '🐱' },
  { id: 3, symbol: '🐰' },
  { id: 4, symbol: '🐼' },
  { id: 5, symbol: '🦄' },
  { id: 6, symbol: '🦊' },
  { id: 7, symbol: '🐸' },
  { id: 8, symbol: '🐧' },
  { id: 9, symbol: '🐟' },
  { id: 10, symbol: '🦕' },
];

const initialState = {
  cards: [],
  flippedIndices: [],
  matchedPairs: 0,
  moves: 0,
  timer: 0,
  gameOver: false,
  level: 1,
  maxLevel: 10,
  flipSound: null,
  matchSound: null,
  levelUpSound: null,
  backgroundMusic: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SETUP_GAME':
      return {
        ...initialState,
        cards: action.payload.cards,
        level: action.payload.level,
        flipSound: state.flipSound,
        matchSound: state.matchSound,
        levelUpSound: state.levelUpSound,
        backgroundMusic: state.backgroundMusic,
      };
    case 'FLIP_CARD':
      return {
        ...state,
        flippedIndices: [...state.flippedIndices, action.payload],
        moves: state.moves + 1,
      };
    case 'CHECK_MATCH':
      const [firstIndex, secondIndex] = state.flippedIndices;
      const firstCard = state.cards[firstIndex];
      const secondCard = state.cards[secondIndex];

      if (firstCard.id === secondCard.id) {
        const updatedCards = state.cards.map((card, index) => {
          if (index === firstIndex || index === secondIndex) {
            return { ...card, matched: true };
          }
          return card;
        });

        const gameOver =
          state.matchedPairs + 1 === state.cards.length / 2 &&
          state.level === state.maxLevel;

        return {
          ...state,
          cards: updatedCards,
          flippedIndices: [],
          matchedPairs: state.matchedPairs + 1,
          gameOver,
        };
      } else {
        return {
          ...state,
          flippedIndices: [],
        };
      }
    case 'RESET_FLIPS':
      return {
        ...state,
        flippedIndices: [],
      };
    case 'INCREMENT_TIMER':
      return {
        ...state,
        timer: state.gameOver ? state.timer : state.timer + 1,
      };
    case 'RESET_GAME':
      return initialState;
    case 'NEXT_LEVEL':
      return {
        ...state,
        level: state.level + 1,
        matchedPairs: 0,
        moves: 0,
        timer: 0,
        gameOver: false,
        cards: action.payload.cards,
      };
    case 'SET_SOUNDS':
      return {
        ...state,
        flipSound: action.payload.flipSound,
        matchSound: action.payload.matchSound,
        levelUpSound: action.payload.levelUpSound,
        backgroundMusic: action.payload.backgroundMusic,
      };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const flipAnimations = state.cards.map(() => new Animated.Value(0));

  useEffect(() => {
    setupGame(1);
    loadSounds();
    const timerInterval = setInterval(() => {
      dispatch({ type: 'INCREMENT_TIMER' });
    }, 1000);
    return () => {
      clearInterval(timerInterval);
      unloadSounds();
    };
  }, []);

  useEffect(() => {
    if (state.flippedIndices.length === 2) {
      setTimeout(() => {
        dispatch({ type: 'CHECK_MATCH' });
        if (
          state.matchedPairs + 1 === state.cards.length / 2 &&
          state.level < state.maxLevel
        ) {
          playSound(state.levelUpSound); // Play level-up sound
          setTimeout(() => {
            setupGame(state.level + 1);
          }, 1000);
        }
      }, 1000);
    }
  }, [state.flippedIndices]);

  useEffect(() => {
    if (state.gameOver || state.level % 5 === 0) {
      stopBackgroundMusic();
    }
  }, [state.gameOver, state.level]);

  const loadSounds = async () => {
    const { sound: flipSound } = await Audio.Sound.createAsync(
      require('./assets/pageturn-102978.mp3') // Add your own flip sound file or download one
    );
    const { sound: matchSound } = await Audio.Sound.createAsync(
      require('./assets/good-6081.mp3') // Add your own match sound file or download one
    );
    const { sound: levelUpSound } = await Audio.Sound.createAsync(
      require('./assets/violin-win-5-185128.mp3') // Add your own level-up sound file or download one
    );
    const { sound: backgroundMusic } = await Audio.Sound.createAsync(
      require('./assets/mystical-music-54294.mp3'), // Add your own background music file or download one
      { isLooping: true }
    );
    await backgroundMusic.playAsync(); // Start background music
    dispatch({ type: 'SET_SOUNDS', payload: { flipSound, matchSound, levelUpSound, backgroundMusic } });
  };

  const unloadSounds = async () => {
    if (state.flipSound) await state.flipSound.unloadAsync();
    if (state.matchSound) await state.matchSound.unloadAsync();
    if (state.levelUpSound) await state.levelUpSound.unloadAsync();
    if (state.backgroundMusic) await state.backgroundMusic.unloadAsync();
  };

  const playSound = async (sound) => {
    if (sound) await sound.replayAsync();
  };

  const stopBackgroundMusic = async () => {
    if (state.backgroundMusic) await state.backgroundMusic.stopAsync();
  };

  const setupGame = (level) => {
    const numPairs = Math.min(level + 2, cardImages.length); // Increase pairs up to the max number of images
    const selectedImages = cardImages.slice(0, numPairs);
    const duplicatedImages = [...selectedImages, ...selectedImages];
    const shuffledCards = duplicatedImages
      .sort(() => Math.random() - 0.5)
      .map((card, index) => ({
        ...card,
        index,
        matched: false,
      }));
    dispatch({ type: 'SETUP_GAME', payload: { cards: shuffledCards, level } });
  };

  const flipCard = (index) => {
    if (state.flippedIndices.length === 2 || state.cards[index].matched) {
      return;
    }
    if (state.flippedIndices.includes(index)) {
      return;
    }
    Animated.timing(flipAnimations[index], {
      toValue: 1,
      duration: 500,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => {
      playSound(state.flipSound); // Play flip sound
      dispatch({ type: 'FLIP_CARD', payload: index });
    });
  };

  const renderCard = ({ item, index }) => {
    const flip = flipAnimations[index].interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });
    return (
      <TouchableOpacity onPress={() => flipCard(index)} disabled={item.matched}>
        <Animated.View style={[styles.card, { transform: [{ rotateY: flip }] }]}>
          {state.flippedIndices.includes(index) || item.matched ? (
            <Text style={styles.cardText}>{item.symbol}</Text>
          ) : (
            <View style={styles.cardBack}>
              <Text style={styles.cardText}>?</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const calculateMemoryPower = () => {
    const efficiency = (state.matchedPairs / state.moves) * 100;
    const speed = state.timer / state.moves;
    let memoryPower = '';

    if (efficiency > 75 && speed < 1.5) {
      memoryPower = 'Excellent Memory!';
    } else if (efficiency > 50 && speed < 2) {
      memoryPower = 'Good Memory!';
    } else {
      memoryPower = 'Needs Improvement';
    }

    return (
      <Text style={styles.memoryReport}>
        {`Memory Power: ${memoryPower}\nEfficiency: ${efficiency.toFixed(2)}%\nSpeed: ${speed.toFixed(2)} sec/move`}
      </Text>
    );
  };

  const renderLevelReport = () => {
    return (
      <View style={styles.reportContainer}>
        <Text style={styles.reportTitle}>Level {state.level - 1} Report</Text>
        {calculateMemoryPower()}
        <TouchableOpacity onPress={() => setupGame(state.level)} style={styles.button}>
          <Text style={styles.buttonText}>Next Level</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#ff7e5f', '#feb47b']} style={styles.background}>
      <View style={styles.container}>
        <Text style={styles.title}>Memory Game - Level {state.level}</Text>
        <Text style={styles.score}>
          Moves: {state.moves} | Timer: {state.timer} sec
        </Text>
        <FlatList
          data={state.cards}
          renderItem={renderCard}
          numColumns={4}
          keyExtractor={(item) => item.index.toString()}
          extraData={state.flippedIndices}
          style={styles.cardList}
        />
        {state.gameOver ? (
          <>
            <Text style={styles.congratulations}>
              🎉 Congratulations! You've completed all levels in {state.moves} moves! 🎉
            </Text>
            {calculateMemoryPower()}
          </>
        ) : state.level % 5 === 0 && state.matchedPairs === state.cards.length / 2 ? (
          renderLevelReport()
        ) : (
          state.matchedPairs === state.cards.length / 2 &&
          state.level < state.maxLevel && (
            <Text style={styles.levelUp}>
              🌟 Level {state.level} Complete! Get ready for the next level... 🌟
            </Text>
          )
        )}
        <TouchableOpacity onPress={() => setupGame(1)} style={styles.button}>
          <Text style={styles.buttonText}>Restart Game</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ffffff',
    textShadowColor: '#ff4500',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  score: {
    fontSize: width * 0.05,
    marginBottom: 20,
    color: '#ffffff',
  },
  cardList: {
    flexGrow: 0,
    marginBottom: 20,
  },
  card: {
    width: width * 0.2,
    height: width * 0.2,
    margin: width * 0.02,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    backfaceVisibility: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
  },
  cardText: {
    fontSize: width * 0.1,
  },
  cardBack: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffeb3b',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratulations: {
    fontSize: width * 0.05,
    color: '#4caf50',
    marginTop: 20,
    textAlign: 'center',
  },
  memoryReport: {
    fontSize: width * 0.045,
    color: '#ff1493',
    marginTop: 10,
    textAlign: 'center',
  },
  levelUp: {
    fontSize: width * 0.05,
    color: '#007bff',
    marginTop: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ff4500',
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.05,
    textAlign: 'center',
  },
  reportContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  reportTitle: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    color: '#ff6347',
    marginBottom: 10,
  },
});
