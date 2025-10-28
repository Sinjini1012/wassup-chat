// client.js

let privateTarget = null;
let inPrivateChat = false;

const userColors = {};
const socket = io();

function getColor(name) {
  if (!userColors[name]) {
    userColors[name] = '#' + Math.floor(Math.random()*16777215).toString(16);
  }
  return userColors[name];
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

const modal = document.getElementById('name-modal');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username');

let Name = '';

joinBtn.addEventListener('click', () => {
  Name = usernameInput.value.trim();
  if (Name) {
    modal.style.display = 'none';
    socket.emit('new-user-joined', Name);
  }
});

const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp')
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');

const emojis = ['😀', '😂', '😍', '😎', '😢', '👍', '🙏', '❤️', '🔥', '🤔'];
emojis.forEach(e => {
  const span = document.createElement('span');
  span.textContent = e;
  span.style.cursor = 'pointer';
  span.style.padding = '5px';
  span.onclick = () => {
    messageInput.value += e;
    emojiPicker.style.display = 'none';
  };
  emojiPicker.appendChild(span);
});

emojiBtn.addEventListener('click', () => {
  emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
});

const messageContainer = document.querySelector(".container")
var audio = new Audio('ting.mp3');

const append = (message, position) => {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', position);

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Extract username part if available
  let username = message.split(':')[0];
  if (username.startsWith('You')) username = Name;

  // Create formatted HTML with colored username
  const coloredName = `<span class="username" style="color:${getColor(username)}; font-weight:600;">${username}</span>`;
  const messageContent = message.includes(':') ? message.split(':').slice(1).join(':') : message;

  // Final formatted bubble
  messageElement.innerHTML = `<span style="opacity:0.7; font-size:12px;">[${time}]</span> ${coloredName}: ${messageContent.trim()}`;

  messageContainer.append(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;

  if (position === 'left') audio.play();
};

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = {
        file: reader.result,
        fileName: file.name,
        fileType: file.type,
        name: Name,
        room: currentRoom
      };
      console.log("[CLIENT] Sending file:", fileData.fileName, fileData.fileType);
      
      // ✅ Show your own file immediately
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('message', 'right');

      const coloredName = `<span class="username" style="color:${getColor(Name)}; font-weight:600;">You</span>: `;

      if (file.type.startsWith('image/')) {
        msgDiv.innerHTML = `${coloredName}<br><img src="${reader.result}" alt="${file.name}" style="width:150px; border-radius:10px;">`;
      } else {
        msgDiv.innerHTML = `${coloredName}<br><a href="${reader.result}" download="${file.name}" target="_blank">📎 ${file.name}</a>`;
      }

      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = reader.result;
        img.alt = file.name;
        img.style.width = '150px';
        img.style.borderRadius = '10px';
        msgDiv.append(`You: `, img);
      } else {
        const fileLink = document.createElement('a');
        fileLink.href = reader.result;
        fileLink.download = file.name;
        fileLink.textContent = `📎 You sent: ${file.name}`;
        fileLink.target = '_blank';
        msgDiv.appendChild(fileLink);
      }

      messageContainer.append(msgDiv);
      messageContainer.scrollTop = messageContainer.scrollHeight;
      audio.play();

      // ✅ Send to others
      socket.emit('file', fileData);
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }
});

// When receiving a file (image or other)
socket.on('file', data => {
  if (data.name === Name) return;
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', 'left');

  const coloredName = `<span class="username" style="color:${getColor(data.name)}; font-weight:600;">${data.name}</span>: `;

  if (data.fileType.startsWith('image/')) {
    msgDiv.innerHTML = `${coloredName}<br><img src="${data.file}" alt="${data.fileName}" style="width:150px; border-radius:10px;">`;
  } else {
    msgDiv.innerHTML = `${coloredName}<br><a href="${data.file}" download="${data.fileName}" target="_blank">📎 ${data.fileName}</a>`;
  }

  // if it's an image
  if (data.fileType.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = data.file;
    img.alt = data.fileName;
    img.style.width = '150px';
    img.style.borderRadius = '10px';
    msgDiv.append(`${data.name}: `, img);
  } else {
    // non-image file
    const fileLink = document.createElement('a');
    fileLink.href = data.file;
    fileLink.download = data.fileName;
    fileLink.textContent = `📎 ${data.name} sent: ${data.fileName}`;
    fileLink.target = '_blank';
    msgDiv.appendChild(fileLink);
  }

  messageContainer.append(msgDiv);
  messageContainer.scrollTop = messageContainer.scrollHeight;
  audio.play();
});

let currentRoom = 'general';
const roomSelect = document.getElementById('room-select');

roomSelect.addEventListener('change', () => {
  currentRoom = roomSelect.value;
  socket.emit('join-room', currentRoom);

  // Clear old messages
  messageContainer.innerHTML = '';
});

form.addEventListener('submit', (e)=> {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;

  if (inPrivateChat) {
    append(`You (private): ${message}`, 'right');
    socket.emit('private-message', { targetId: privateTarget, message });
  } else {
    append(`You: ${message}`, 'right');
    socket.emit('send', { message, room: currentRoom });
  }
  messageInput.value = '';
});

const backBtn = document.getElementById('backToRoom');
backBtn.addEventListener('click', () => {
  inPrivateChat = false;
  privateTarget = null;
  backBtn.style.display = 'none';
  messageContainer.innerHTML = '';
  socket.emit('join-room', currentRoom);
});

socket.on('private-receive', data => {
  inPrivateChat = true;
  privateTarget = data.from;
  append(`(Private) ${data.name}: ${data.message}`, 'left');
});

socket.on('load-history', history => {
  messageContainer.innerHTML = '';
  history.forEach(h => {
    const msgText = typeof h.message === 'object' ? JSON.stringify(h.message) : String(h.message);
    append(`${h.name}: ${msgText}`, 'left');
  });
});

messageInput.addEventListener('input', () => {
  socket.emit('typing', Name);
});

socket.on('show-typing', (name) => {
  let typingDiv = document.getElementById('typing');
  if (!typingDiv) {
    typingDiv = document.createElement('div');
    typingDiv.id = 'typing';
    typingDiv.innerHTML = `<i>${name} is typing...</i>`;
    typingDiv.style.color = 'gray';
    typingDiv.style.fontStyle = 'italic';
    messageContainer.append(typingDiv);
  }
  clearTimeout(typingDiv.timer);
  typingDiv.timer = setTimeout(() => typingDiv.remove(), 2000);
});


function openPrivateChat(user) {
  if (user.id === socket.id) return alert("You can't DM yourself!");
  inPrivateChat = true;
  privateTarget = user.id;
  messageContainer.innerHTML = '';
  append(`🔒 Private chat with ${user.name}`, 'right');
  backBtn.style.display = 'block';
}

// const Name = prompt("Enter your name to join");
//socket.emit('new-user-joined', Name);

//socket.emit('send', { message, room: currentRoom });

// --- System Join/Leave messages ---
socket.on('user-joined', name => {
  if (name !== Name) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = `[${time}] ${name} joined the chat`;
    const sysMsg = document.createElement('div');
    sysMsg.classList.add('message', 'center');
    sysMsg.innerText = msg;
    messageContainer.append(sysMsg);
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }
});

socket.on('left', name => {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msg = `[${time}] ${name} left the chat`;
  const sysMsg = document.createElement('div');
  sysMsg.classList.add('message', 'center');
  sysMsg.innerText = msg;
  messageContainer.append(sysMsg);
  messageContainer.scrollTop = messageContainer.scrollHeight;
});

if (Notification.permission !== "granted") {
  Notification.requestPermission();
}

socket.on('receive', data => {
  console.log("[CLIENT] Received:", data);
  const msgText = typeof data.message === 'object' ? JSON.stringify(data.message) : String(data.message);
  append(`${data.name}: ${msgText}`, 'left');
});

socket.on('user-list', users => {
  const list = document.getElementById('usernames');
  list.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.innerText = u.name;
    li.dataset.id = u.id;
    li.style.cursor = 'pointer';
    li.onclick = () => openPrivateChat(u);
    list.append(li);
    });
});
