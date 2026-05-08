import axios from "axios";

const API = "http://127.0.0.1:8010";

export async function createSection(pageId) {
  const response = await axios.post(`${API}/sections`, {
    page_id: pageId,
    title: "Новый раздел",
    description: "",
    order_index: 0,
  });

  return response.data;
}