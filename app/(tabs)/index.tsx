import { Audio } from "expo-av";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";

const { width: screenWidth } = Dimensions.get("window");
const SWIPE_THRESHOLD = 80;
const REPLY_THRESHOLD = 60;

const HomeScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hey! How are you doing today?",
      sender: "John",
      timestamp: new Date("2024-06-27T10:30:00"),
      type: "text",
      isOwnMessage: false,
    },
    {
      id: "2",
      text: "I'm doing great! Thanks for asking 😊",
      sender: "You",
      timestamp: new Date("2024-06-27T10:32:00"),
      type: "text",
      isOwnMessage: true,
    },
    {
      id: "3",
      text: "Check out this audio message!",
      sender: "John",
      timestamp: new Date("2024-06-27T10:35:00"),
      type: "audio",
      audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      duration: 15,
      isOwnMessage: false,
    },
    {
      id: "4",
      text: "That's awesome! Let me reply to your first message.",
      sender: "You",
      timestamp: new Date("2024-06-27T10:40:00"),
      type: "text",
      isOwnMessage: true,
      replyTo: "1",
    },
    {
      id: "5",
      text: "Here's my audio response",
      sender: "You",
      timestamp: new Date("2024-06-27T10:42:00"),
      type: "audio",
      audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      duration: 8,
      isOwnMessage: true,
    },
  ]);

  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const soundRef = useRef(null);

  const formatTime = useCallback((timestamp) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString();
    }
  }, []);

  const deleteMessage = useCallback((messageId) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setDeletingMessageId(messageId);
            setTimeout(() => {
              setMessages((prevMessages) =>
                prevMessages.filter((msg) => msg.id !== messageId)
              );
              setDeletingMessageId(null);
            }, 300);
          },
        },
      ]
    );
  }, []);

  const startReply = useCallback((message) => {
    setReplyingTo(message);
    setReplyModalVisible(true);
  }, []);

  const sendReply = useCallback(() => {
    if (replyText.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: replyText,
        sender: "You",
        timestamp: new Date(),
        type: "text",
        isOwnMessage: true,
        replyTo: replyingTo.id,
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setReplyText("");
      setReplyModalVisible(false);
      setReplyingTo(null);
    }
  }, [replyText, replyingTo]);

  const playAudio = useCallback(async (audioUrl, messageId) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      setPlayingAudio(messageId);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudio(null);
        }
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      Alert.alert("Error", "Could not play audio message");
      setPlayingAudio(null);
    }
  }, []);

  const stopAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setPlayingAudio(null);
    }
  }, []);

  const getReplyMessage = useCallback(
    (replyToId) => {
      return messages.find((msg) => msg.id === replyToId);
    },
    [messages]
  );

  const MessageItem = React.memo(({ item }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const replyOpacity = useRef(new Animated.Value(0)).current;
    const deleteOpacity = useRef(new Animated.Value(0)).current;
    const messageOpacity = useRef(new Animated.Value(1)).current;
    const messageScale = useRef(new Animated.Value(1)).current;

    const replyMessage = item.replyTo ? getReplyMessage(item.replyTo) : null;

    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = useCallback(
      (event) => {
        const { state, translationX } = event.nativeEvent;

        if (state === State.ACTIVE) {
          const absTranslation = Math.abs(translationX);

          // Show reply icon for left/right swipe based on message ownership
          if (
            (!item.isOwnMessage && translationX > REPLY_THRESHOLD) ||
            (item.isOwnMessage && translationX < -REPLY_THRESHOLD)
          ) {
            Animated.timing(replyOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          } else {
            Animated.timing(replyOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }

          // Show delete icon for significant swipe functionality
          if (absTranslation > SWIPE_THRESHOLD) {
            Animated.timing(deleteOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          } else {
            Animated.timing(deleteOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }
        }

        if (state === State.END) {
          const absTranslation = Math.abs(translationX);

          if (absTranslation > SWIPE_THRESHOLD) {
            deleteMessage(item.id);
          } else if (
            (!item.isOwnMessage && translationX > REPLY_THRESHOLD) ||
            (item.isOwnMessage && translationX < -REPLY_THRESHOLD)
          ) {
            startReply(item);
          }

          // Reset animations
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 300,
              friction: 8,
            }),
            Animated.timing(replyOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
      [item.id, item.isOwnMessage]
    );

    // Delete animation effect for message
    React.useEffect(() => {
      if (deletingMessageId === item.id) {
        Animated.parallel([
          Animated.timing(messageOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(messageScale, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [deletingMessageId, item.id, messageOpacity, messageScale]);

    return (
      <View style={styles.messageWrapper}>
        {/* Background Icons   to show */}
        <View style={styles.backgroundIcons}>
          <Animated.View
            style={[
              styles.replyIcon,
              {
                opacity: replyOpacity,
                left: item.isOwnMessage ? undefined : 20,
                right: item.isOwnMessage ? 20 : undefined,
              },
            ]}
          >
            <Text style={styles.iconText}>↩️</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.deleteIcon,
              {
                opacity: deleteOpacity,
                left: item.isOwnMessage ? 20 : undefined,
                right: item.isOwnMessage ? undefined : 20,
              },
            ]}
          >
            <Text style={styles.iconText}>🗑️</Text>
          </Animated.View>
        </View>

        {/* Message Content  coverd */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetX={[-10, 10]}
        >
          <Animated.View
            style={[
              styles.messageContainer,
              item.isOwnMessage ? styles.ownMessage : styles.otherMessage,
              {
                transform: [{ translateX }, { scale: messageScale }],
                opacity: messageOpacity,
              },
            ]}
          >
            {/* Reply Preview  messages */}
            {replyMessage && (
              <View style={styles.replyPreview}>
                <Text style={styles.replyAuthor}>{replyMessage.sender}</Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {replyMessage.type === "audio"
                    ? "🎵 Audio message"
                    : replyMessage.text}
                </Text>
              </View>
            )}

            {/* Message Content  to show*/}
            <View style={styles.messageContent}>
              {item.type === "text" ? (
                <Text
                  style={[
                    styles.messageText,
                    { color: item.isOwnMessage ? "white" : "#333" },
                  ]}
                >
                  {item.text}
                </Text>
              ) : (
                <View style={styles.audioMessage}>
                  <TouchableOpacity
                    style={styles.audioButton}
                    onPress={() => {
                      if (playingAudio === item.id) {
                        stopAudio();
                      } else {
                        playAudio(item.audioUrl, item.id);
                      }
                    }}
                  >
                    <Text style={styles.audioButtonText}>
                      {playingAudio === item.id ? "⏸️" : "▶️"}
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.audioDuration,
                      { color: item.isOwnMessage ? "white" : "#666" },
                    ]}
                  >
                    {item.duration}s
                  </Text>
                  <Text
                    style={[
                      styles.audioLabel,
                      { color: item.isOwnMessage ? "white" : "#666" },
                    ]}
                  >
                    Audio
                  </Text>
                </View>
              )}

              <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.messageTime,
                    {
                      color: item.isOwnMessage
                        ? "rgba(255, 255, 255, 0.7)"
                        : "#999",
                    },
                  ]}
                >
                  {formatTime(item.timestamp)}
                </Text>
                <Text
                  style={[
                    styles.messageSender,
                    {
                      color: item.isOwnMessage
                        ? "rgba(255, 255, 255, 0.7)"
                        : "#999",
                    },
                  ]}
                >
                  {item.sender}
                </Text>
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => startReply(item)}
              >
                <Text style={styles.quickActionText}>↩️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.deleteQuickAction]}
                onPress={() => deleteMessage(item.id)}
              >
                <Text style={styles.quickActionText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  });

  const renderMessage = useCallback(({ item }) => {
    return <MessageItem item={item} />;
  }, []);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#007AFF" />

        {/* Header for messeging  */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContainer}
          removeClippedSubviews={false}
          getItemLayout={(data, index) => ({
            length: 100,
            offset: 100 * index,
            index,
          })}
        />

        {/* Reply Modal  view */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={replyModalVisible}
          onRequestClose={() => setReplyModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setReplyModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    Reply to {replyingTo?.sender}
                  </Text>

                  {replyingTo && (
                    <View style={styles.originalMessage}>
                      <Text style={styles.originalMessageText}>
                        {replyingTo.type === "audio"
                          ? "🎵 Audio message"
                          : replyingTo.text}
                      </Text>
                    </View>
                  )}

                  <TextInput
                    style={styles.replyInput}
                    placeholder="Type your reply..."
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    autoFocus
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setReplyModalVisible(false);
                        setReplyText("");
                        setReplyingTo(null);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.sendButton]}
                      onPress={sendReply}
                    >
                      <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#007AFF",
    padding: 16,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  backgroundIcons: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 0,
  },
  replyIcon: {
    position: "absolute",
    top: "50%",
    marginTop: -15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    borderRadius: 15,
  },
  deleteIcon: {
    position: "absolute",
    top: "50%",
    marginTop: -15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F44336",
    borderRadius: 15,
  },
  iconText: {
    fontSize: 16,
    color: "white",
  },
  messageContainer: {
    padding: 12,
    borderRadius: 12,
    maxWidth: "80%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    zIndex: 1,
  },
  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  replyPreview: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "rgba(255, 255, 255, 0.5)",
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  replyText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  messageContent: {
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  audioMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
  },
  audioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  audioButtonText: {
    fontSize: 16,
  },
  audioDuration: {
    fontSize: 12,
    marginRight: 8,
    fontWeight: "600",
  },
  audioLabel: {
    fontSize: 12,
    fontStyle: "italic",
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: "bold",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
    opacity: 0.8,
  },
  quickActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  deleteQuickAction: {
    backgroundColor: "rgba(255, 0, 0, 0.3)",
  },
  quickActionText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  originalMessage: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  originalMessageText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  replyInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  sendButton: {
    backgroundColor: "#007AFF",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
  },
  sendButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default HomeScreen;
