import axios from "axios";
// import { logout } from "../Redux/slice/authSlice";
import { adminSaveBaseUrl } from '../Utility/baseUrl';
// import store from "../Redux/store/store";
 
const adminApi = axios.create({
    baseURL: adminSaveBaseUrl,
});


adminApi.interceptors.request.use( 
    (config) => {
        // const { token } = store.getState().auth;
      //  const token  ='Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbkBnbWFpbC5jb20iLCJpYXQiOjE3NDQ5NzQ0MTksImV4cCI6MTc0NTA2MDgxOX0.sk5vdXoGvnznC43KMGxV0cuDFiZr0s2PCfYatLwsKcSxTtEoerLU4rGPWhyykJ3ANySv17ydEWizssjKzk8gQg' ;


       // if (token) {
      //      config.headers.Authorization = token;
      //  }
        return config;
    },
    (error) => {
        throw error;
    }
);

adminApi.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {

        // if (error.response && error.response.status === 401) {
        //     store.dispatch(logout());
            
        // }
        throw error;
    }
);

export default adminApi;
