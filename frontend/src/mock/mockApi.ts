import MockAdapter from 'axios-mock-adapter';
import api from '../services/api';

const mock = new MockAdapter(api, { delayResponse: 500 });

// Fake Database
const users = [
  { id: 'u1', name: 'John Doe', email: 'test@example.com', password: 'password' }
];

let events = [
  {
    id: 'e1',
    title: 'Summer Festival 2024',
    description: 'A beautiful summer festival with lots of music and joy.',
    imageCount: 3,
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
    images: [
      { id: 'img1', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80' },
      { id: 'img2', url: 'https://images.unsplash.com/photo-1533174000220-db7df5388c22?w=800&q=80' },
      { id: 'img3', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80' },
    ]
  },
  {
    id: 'e2',
    title: 'Tech Conference Meetup',
    description: 'Networking and learning about the latest in AI and web dev.',
    imageCount: 2,
    thumbnailUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=500&q=80',
    images: [
      { id: 'img4', url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80' },
      { id: 'img5', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80' },
    ]
  }
];

// --- AUTH MOCKS ---
mock.onPost('/user/login').reply((config) => {
  const { email, password } = JSON.parse(config.data);
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    return [200, { token: 'mock-jwt-token-123', user: { id: user.id, name: user.name, email: user.email } }];
  }
  return [401, { message: 'Invalid credentials. Use test@example.com / password' }];
});

mock.onPost('/user/signup').reply((config) => {
  const { name, email, password } = JSON.parse(config.data);
  const newUser = { id: `u${Date.now()}`, name, email, password };
  users.push(newUser);
  return [200, { token: 'mock-jwt-token-123', user: { id: newUser.id, name, email } }];
});

// --- EVENT MOCKS ---
mock.onGet('/events').reply(() => {
  return [200, { events: events.map(({ images, ...rest }) => rest) }];
});

mock.onGet(/\/events\/[a-zA-Z0-9]+$/).reply((config) => {
  const eventId = config.url?.split('/').pop();
  const event = events.find(e => e.id === eventId);
  if (event) {
    return [200, { event }];
  }
  return [404, { message: 'Event not found' }];
});

mock.onPost('/events').reply(() => {
  // Since it's FormData, it's hard to parse perfectly in mock adapter, we'll just mock a success response.
  const newEvent = {
    id: `e${Date.now()}`,
    title: 'New Uploaded Event',
    description: 'Description generated from mock.',
    imageCount: 0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=500&q=80',
    images: []
  };
  events.push(newEvent);
  return [200, { event: newEvent }];
});

mock.onPost(/\/events\/[a-zA-Z0-9]+\/upload/).reply((config) => {
  const eventId = config.url?.split('/')[2];
  const eventIndex = events.findIndex(e => e.id === eventId);
  if (eventIndex !== -1) {
    // Mock adding images
    events[eventIndex].images.push({
      id: `img${Date.now()}`,
      url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80'
    });
    events[eventIndex].imageCount += 1;
    return [200, { message: 'Uploaded successfully' }];
  }
  return [404, { message: 'Event not found' }];
});

mock.onPost(/\/events\/([a-zA-Z0-9]+)\/search/).reply(() => {
  // Mock search result
  return [200, {
    result: {
      imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
      faces: [{ x: 150, y: 150, width: 100, height: 100 }]
    }
  }];
});

mock.onPost(/\/events\/share\/[a-zA-Z0-9]+\/search/).reply(() => {
  // Mock public search result
  return [200, {
    result: {
      imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80',
      faces: [{ x: 200, y: 100, width: 80, height: 80 }]
    }
  }];
});

console.log('Mock API Initialized. Use test@example.com / password to login.');
