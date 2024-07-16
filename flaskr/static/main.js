const socket = io({ autoConnect: false });
let privateKey, publicKey;
var clientKeys = {}; /** {'username', 'publicKey'} */
var username, chatClient;
var isCurrentUser = true;

/**
 * Function to load the email request
 */

function loadRequest() {
    const formContent = `
        <div class="email-form-container">
            <p>Send Connection Request</p>
            <form method="POST" action="{{ url_for('send_email') }}">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required><br><br>
                
                <label for="subject">Subject:</label>
                <input type="text" id="subject" name="subject" required><br><br>
                
                <label for="body">Body:</label>
                <textarea id="body" name="body" required></textarea><br><br>
                
                <button type="submit">Send Email</button>
            </form>
        </div>
    `;
    // load to the div_connect_request
    document.getElementById('div_connect_request').innerHTML = formContent;
}

document.addEventListener('DOMContentLoaded', async () => {
    //publicKey = await generateRSAKeyPair()   
    publicKey = "abc"

    document.getElementById("join-btn").addEventListener("click", async function () {
        username = document.getElementById("username").value;

        socket.connect();
        // const clientPublicKey = await generateRSAKeyPair()
        const clientPublicKey = publicKey;

        socket.on("connect", function () {
            socket.emit('user_join', { recipient: username, publicKey: publicKey });

        })

        document.getElementById("chat").style.display = "block";
        document.getElementById("landing").style.display = "none";
    })

    document.getElementById("message-input").addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendMessage();
        }
    });

    socket.on('message', async (data) => {
        //const decryptedMessage = await decryptMessage(privateKey, data.message);
        //console.log(`Message from ${data.sender_sid}:`, decryptedMessage);
        isCurrentUser = false;
        let ul = document.getElementById("chat-msg");
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(data["sender"] + " : " + data["message"]));
        li.classList.add("left-align");
        ul.appendChild(li);
        ul.scrolltop = ul.scrollHeight;
    });

    socket.on("allUsers", function (data) {
        clientKeys = data["allUserKeys"];
        console.log(username);
        delete clientKeys[username];
        loadFriends();
    })

    function loadFriends() {
        const friendsList = document.getElementById("friends-list");
        friendsList.innerHTML = "";
        for (const [user, key] of Object.entries(clientKeys)) {
            let li = document.createElement("li");
            li.innerHTML = `
                <div class="status-indicator"></div>                
                <div class="username">${user}</div>
                <div class="action"><input type="button" name="connect" value="Invite to chat" onclick="loadRequest()"></div>
            `;
            li.addEventListener("click", () => {
                chatClient = user;
                // Clear chat messages
                const chatMessages = document.getElementById("chat-msg");
                chatMessages.innerHTML = "";
                chatMessages.scrollTop = chatMessages.scrollHeight;

                // Display user selected for chat
                let chatStatusMessage = document.createElement("li");
                chatStatusMessage.classList.add("left-align");
                chatStatusMessage.innerText = `${user} is available to chat`;
                chatMessages.appendChild(chatStatusMessage);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            });
            friendsList.appendChild(li);
        }
    }
 
    document.getElementById('send').onclick = () => {
        sendMessage();
    };

    document.getElementById('logout-btn').onclick = () => {
        logout();
    };

    function sendMessage() {
        const clientMessage = document.getElementById('message-input').value;
        if (chatClient && clientMessage.trim() !== "") {
            document.getElementById("message-input").value = "";
            socket.emit('message', { recipient_name: chatClient, message: clientMessage });

            isCurrentUser = true;
            let ul = document.getElementById("chat-msg");
            let li = document.createElement("li");
            li.appendChild(document.createTextNode("Me : " + clientMessage));
            li.classList.add("right-align");
            ul.appendChild(li);
            ul.scrollTop = ul.scrollHeight;
        } else if (clientMessage.trim() === "") {
            console.error('Empty message cannot be sent');
        } else {
            console.error('No chat client selected');
        }
    }

    function logout() {
        fetch('/logout', {
            method: 'GET',
            credentials: 'same-origin'
        }).then(response => {
            if (response.ok) {
                window.location.href = '/';
            } else {
                console.error("Logout failed");
            }
        }).catch(error => {
            console.error("Logout error:", error);
        });
    }

    async function generateRSAKeyPair() {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256"
            },
            true,
            ["encrypt", "decrypt"]
        );
        publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        privateKey = keyPair.privateKey;
        return publicKey;
    }

    async function encryptMessage(publicKey, message) {
        const importedPublicKey = await window.crypto.subtle.importKey(
            "spki",
            base64ToArrayBuffer(publicKey),
            {
                name: "RSA-OAEP",
                hash: "SHA-256"
            },
            true,
            ["encrypt"]
        );
        const encryptedMessage = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
            },
            importedPublicKey,
            new TextEncoder().encode(message)
        );
        return arrayBufferToBase64(encryptedMessage);
    }

    async function decryptMessage(privateKey, encryptedMessage) {
        const decryptedMessage = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
            },
            privateKey,
            base64ToArrayBuffer(encryptedMessage)
        );
        return new TextDecoder().decode(decryptedMessage);
    }

    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
});
