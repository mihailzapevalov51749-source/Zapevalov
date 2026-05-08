import axios from "axios";

const API = "http://127.0.0.1:8010";

export async function updateSection(sectionId, data) {
  const response = await axios.put(`${API}/sections/${sectionId}`, data);
  return response.data;
}

export async function deleteSection(sectionId) {
  const response = await axios.delete(`${API}/sections/${sectionId}`);
  return response.data;
}

export async function moveSection(sectionId, targetOrderIndex) {
  const response = await axios.post(`${API}/sections/move`, [
    {
      id: Number(sectionId),
      sort_order: Number(targetOrderIndex),
    },
  ]);

  return response.data;
}