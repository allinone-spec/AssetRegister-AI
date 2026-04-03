import axios from "axios";
import toast from "react-hot-toast";
import { adminBaseUrl, baseUrl } from "../Utility/baseUrl";

export const getRequest = async (url, showToast = true) => {
  try {
    const response = await axios.get(`${baseUrl}${url}`);
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    showToast &&
      error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};
export const getUser = async (url) => {
  try {
    const response = await axios.get(`${baseUrl}${url}`);
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};

export const getReadAllTheme = async (url) => {
  try {
    const response = await axios.get(`${baseUrl}${url}`);
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};

export const createTheme = async (url, formData) => {
  try {
    const formDataObj = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null && formData[key] !== undefined) {
        formDataObj.append(key, formData[key]);
      }
    });
    const response = await axios.post(`${baseUrl}${url}`, formDataObj);
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};

export const createFolder = async (url, payload) => {
  try {
    const response = await axios.post(`${baseUrl}${url}`, payload);
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};

export const postDataRequest = async (url, payload) => {
  try {
    const response = await axios.post(`${baseUrl}${url}`, payload);
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};

export const postMultipartFormRequest = async (url, payload) => {
  try {
    const response = await axios.post(`${baseUrl}${url}`, payload, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};

export const postApplicationJsonRequest = async (url, payload) => {
  try {
    const response = await axios.post(`${baseUrl}${url}`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    console.log("Error fetching data:", error);
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : error?.response?.data
              ? error?.response?.data
              : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};

export const patchRequest = async (url, payload) => {
  try {
    const response = await axios.patch(`${baseUrl}${url}`, payload);
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : error?.response?.data
              ? error?.response?.data
              : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};

export const patchMultipartFormRequest = async (url, formData) => {
  try {
    const formDataObj = new FormData();
    Object.keys(formData).forEach((key) => {
      formDataObj.append(key, formData[key]);
    });

    const response = await axios.patch(`${baseUrl}${url}`, formDataObj, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};

export const deleteRequest = async (url) => {
  try {
    const response = await axios.delete(`${baseUrl}${url}`);
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
            ? error.response.data.message
            : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined },
      );
  }
};
