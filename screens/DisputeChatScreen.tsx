import { useEffect, useState } from "react";
import { View, TextInput, FlatList, Pressable, StyleSheet } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { firebaseService, DisputeMessage } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { ThemedText } from "../components/ThemedText";

type Props = {
  route: RouteProp<{ params: { orderId: string } }, "params">;
};

export default function DisputeChatScreen({ route }: Props) {
  const { orderId } = route.params;
  const { user } = useAuth();

  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!orderId) return;
    const unsub = firebaseService.listenToDisputeMessages(orderId, setMessages);
    return () => unsub();
  }, [orderId]);

  if (!user) return null;

  const send = async () => {
    if (!text.trim()) return;

    await firebaseService.sendDisputeMessage(
      orderId,
      user.uid,
      user.role,
      text.trim()
    );

    setText("");
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.senderId === user.uid ? styles.me : styles.them,
            ]}
          >
            <ThemedText>{item.message}</ThemedText>
            <ThemedText style={styles.roleTag}>{item.senderRole}</ThemedText>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type message..."
          style={styles.input}
        />
        <Pressable onPress={send} style={styles.sendBtn}>
          <ThemedText style={{ color: "#fff" }}>Send</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 10,
    maxWidth: "80%",
  },
  me: {
    backgroundColor: "#d1f5d3",
    alignSelf: "flex-end",
  },
  them: {
    backgroundColor: "#eee",
    alignSelf: "flex-start",
  },
  roleTag: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 4,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  sendBtn: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
});
