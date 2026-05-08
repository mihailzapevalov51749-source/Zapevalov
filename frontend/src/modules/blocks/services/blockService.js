import axios from "axios";

const API = "http://127.0.0.1:8010";

export async function updateBlock(blockId, data) {
  const response = await axios.put(`${API}/blocks/${blockId}`, data);
  return response.data;
}

export async function deleteBlock(blockId) {
  const response = await axios.delete(`${API}/blocks/${blockId}`);
  return response.data;
}

export async function moveBlock(blockId, targetSectionId, targetOrderIndex) {
  const response = await axios.post(`${API}/blocks/move`, [
    {
      id: Number(blockId),
      section_id: Number(targetSectionId),
      sort_order: Number(targetOrderIndex),
    },
  ]);

  return response.data;
}