import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
	apiKey: "AIzaSyDZu-tdKbWk9EyHsGv0_Bo2uSQUHXucNtU",
	authDomain: "collobrationtest.firebaseapp.com",
	databaseURL: "https://collobrationtest-default-rtdb.firebaseio.com",
	projectId: "collobrationtest",
	storageBucket: "collobrationtest.firebasestorage.app",
	messagingSenderId: "128814116124",
	appId: "1:128814116124:web:9c5624ef281d287b351ed9",
	measurementId: "G-NNRXPNFPNB",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
