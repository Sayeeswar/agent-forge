import { DEFAULT_MODEL } from '../models.js';

export const initialState = { topics: [] };

export function topicsReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;

    case 'ADD_TOPIC': {
      const topic = {
        id: action.id,
        name: action.name,
        subtopic: action.subtopic || '',
        material: action.material || '',
        model: action.model || DEFAULT_MODEL,
        lastActivityAt: new Date().toISOString(),
        messages: [],
        quizHistory: [],
      };
      return { topics: [...state.topics, topic] };
    }

    case 'RENAME_TOPIC':
      return {
        topics: state.topics.map((t) => (t.id === action.id ? { ...t, name: action.name } : t)),
      };

    case 'SET_TOPIC_MODEL':
      return {
        topics: state.topics.map((t) => (t.id === action.id ? { ...t, model: action.model } : t)),
      };

    case 'DELETE_TOPIC':
      return { topics: state.topics.filter((t) => t.id !== action.id) };

    case 'ADD_MESSAGE':
      return {
        topics: state.topics.map((t) =>
          t.id === action.topicId
            ? { ...t, messages: [...t.messages, action.message], lastActivityAt: new Date().toISOString() }
            : t
        ),
      };

    case 'ADD_QUIZ_RESULT':
      return {
        topics: state.topics.map((t) =>
          t.id === action.topicId ? { ...t, quizHistory: [...t.quizHistory, action.result] } : t
        ),
      };

    default:
      return state;
  }
}
