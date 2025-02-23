import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ToastAndroid,
  Share,
  Platform,
  PermissionsAndroid,
  SafeAreaView,
  StatusBar,
  ScrollView
} from 'react-native';

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';

interface Task {
  id: string;
  text: string;
}

const VoiceTranscriber = () => {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [events, setEvents] = useState<{ title: string; time: string }[]>([]);

  useEffect(() => {
    requestStoragePermission();
  }, []);


  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);

        if (
          granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('Storage permissions granted');
        } else {
          console.log('Storage permissions denied');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const callGeminiAPI = async (prompt: string) => {
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.candidates || result.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    return result.candidates[0].content.parts[0].text;
  };


  const summarizeText = async () => {
    if (!text.trim()) {
      ToastAndroid.show('Please enter some text first', ToastAndroid.SHORT);
      return;
    }

    setIsLoading(true);
    try {
      const prompt = `Please provide a concise summary of the following text:\n\n${text}`;
      const generatedSummary = await callGeminiAPI(prompt);
      setSummary(generatedSummary);
    } catch (error) {
      console.error("Error summarizing text:", error);
      ToastAndroid.show('Error generating summary', ToastAndroid.SHORT);
    } finally {
      setIsLoading(false);
    }
  };

  const extractTasks = async () => {
    if (!text.trim()) {
      ToastAndroid.show('Please enter some text first', ToastAndroid.SHORT);
      return;
    }

    setIsLoading(true);
    try {
      const prompt = `Extract all tasks and action items from the following text. Format each task on a new line starting with "- ":\n\n${text}`;
      const extractedTasksText = await callGeminiAPI(prompt);

      interface ExtractedTask {
        id: string;
        text: string;
      }

      const taskList: ExtractedTask[] = extractedTasksText
        .split('\n')
        .filter((task: string) => task.trim().startsWith('-'))
        .map((task: string) => ({
          id: Math.random().toString(36).substr(2, 9),
          text: task.trim().substring(2).trim()
        }));

      setTasks(taskList);
    } catch (error) {
      console.error("Error extracting tasks:", error);
      ToastAndroid.show('Error extracting tasks', ToastAndroid.SHORT);
    } finally {
      setIsLoading(false);
    }
  };

  const shareNotes = async () => {
    try {
      let shareText = text + '\n\n';

      if (events.length > 0) {
        shareText += 'Events:\n';
        events.forEach(event => {
          shareText += `- ${event.title}: ${event.time}\n`;
        });
        shareText += '\n';
      }

      if (tasks.length > 0) {
        shareText += 'Tasks:\n';
        tasks.forEach(task => {
          shareText += `- ${task}\n`;
        });
      }

      await Share.share({ message: shareText });
    } catch (error) {
      ToastAndroid.show('Error sharing notes', ToastAndroid.SHORT);
    }
  };


  const clearAll = () => {
    setText('');
    setSummary('');
    setTasks([]);
    inputRef.current?.clear();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Voice Transcriber</Text>

            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Open GBoard and use voice typing..."
                placeholderTextColor="#6C757D"
                multiline
              />
            </View>

            <View style={styles.buttonGrid}>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={summarizeText}
                disabled={isLoading}

              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Processing...' : 'Summarize'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={extractTasks}
                disabled={isLoading}

              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Processing...' : 'Extract Tasks'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.outlineButton]}
                onPress={shareNotes}
              >
                <Text style={[styles.buttonText, styles.outlineButtonText]}>
                  Share
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.outlineButton]}
                onPress={clearAll}
              >
                <Text style={[styles.buttonText, styles.outlineButtonText]}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {summary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <Text style={styles.sectionContent}>{summary}</Text>
              </View>
            )}

            {tasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tasks</Text>
                {tasks.map((task) => (
                  <View key={task.id} style={styles.taskItem}>
                    <View>
                      <Text>-</Text>
                    </View>
                    <Text style={styles.taskText}>{task.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  }, scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  taskBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#F9FAFB',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    minWidth: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  destructiveButton: {
    backgroundColor: '#DC2626',
  },
  secondaryButton: {
    backgroundColor: '#4B5563',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  outlineButtonText: {
    color: '#6B7280',
  },
  resultsContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  badge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  taskText: {
    fontSize: 16,
    color: '#374151',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
});

export default VoiceTranscriber;
