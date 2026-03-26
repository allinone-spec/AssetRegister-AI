import axios from "axios";
// import axios from "./adminSave";
import { adminBaseUrl, adminSaveBaseUrl } from "../Utility/baseUrl";
import toast from "react-hot-toast";

export const getRequest = async (url) => {
  try {
    const data = await axios.get(`${adminSaveBaseUrl}${url}`);
    return data;
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
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const getAdminRequest = async (url) => {
  try {
    const data = await axios.get(`${adminBaseUrl}${url}`);
    return data;
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
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const postAdminRequest = async (url) => {
  try {
    const data = await axios.post(`${adminBaseUrl}${url}`);
    return data;
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
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const postDataRequest = async (url, payload) => {
  try {
    const response = await axios.post(`${adminSaveBaseUrl}${url}`, payload);
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
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const postMultipartFormRequest = async (url, payload) => {
  try {
    const response = await axios.post(`${adminSaveBaseUrl}${url}`, payload, {
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
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const postApplicationJsonRequest = async (url, payload) => {
  try {
    const response = await axios.post(`${adminSaveBaseUrl}${url}`, payload, {
      headers: {
        "Content-Type": "application/json",
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
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const patchRequest = async (url, payload) => {
  try {
    const response = await axios.patch(`${adminSaveBaseUrl}${url}`, payload);
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
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const patchMultipartFormRequest = async (url, payload) => {
  try {
    const response = await axios.patch(`${adminSaveBaseUrl}${url}`, payload, {
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
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const deleteRequest = async (url) => {
  try {
    const response = await axios.delete(`${adminSaveBaseUrl}${url}`);
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
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};
