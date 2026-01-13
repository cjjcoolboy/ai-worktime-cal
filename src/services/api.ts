import axios from 'axios';
import { RecognizedTime } from '../types';

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

export interface SiliconFlowContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface SiliconFlowMessage {
  role: 'user';
  content: string | SiliconFlowContentPart[];
}

export interface SiliconFlowRequest {
  model: string;
  messages: SiliconFlowMessage[];
  max_tokens?: number;
  temperature?: number;
}

export interface SiliconFlowResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 将图片转换为Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// 识别打卡时间
export const recognizeClockTimes = async (
  imageFile: File
): Promise<RecognizedTime[]> => {
  const base64Image = await fileToBase64(imageFile);

  const prompt = `请识别这张打卡记录截图中的所有打卡时间。
请严格按照以下JSON格式返回，不要添加任何其他文字：

{
  "records": [
    {
      "date": "2024-01-13",
      "times": ["09:00", "12:00", "13:30", "18:00"]
    }
  ]
}

注意事项：
1. 如果图片中只有时间没有日期，请根据文件名或上下文推断日期
2. 如果一天有多个打卡时间，请按时间顺序排列
3. 如果无法识别日期，请标注"未知日期"
4. 只返回JSON，不要返回其他内容`;

  const requestBody = {
    model: 'Qwen/Qwen2.5-VL-72B-Instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: base64Image
            }
          },
          { type: 'text', text: prompt }
        ]
      }
    ],
    max_tokens: 1000,
    temperature: 0.1
  };

  const apiKey = import.meta.env.VITE_SILICONFLOW_API_KEY;

  if (!apiKey) {
    throw new Error('请在 .env 文件中配置 VITE_SILICONFLOW_API_KEY');
  }

  try {
    const response = await axios.post<SiliconFlowResponse>(SILICONFLOW_API_URL, requestBody, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    const content = response.data.choices[0]?.message?.content || '';
    
    // 解析JSON响应
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法识别打卡时间，请重试');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result.records || [];
  } catch (error: any) {
    console.error('API调用详情:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    if (axios.isAxiosError(error)) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error?.message || 'API调用失败';
      throw new Error(`${errorMsg} (状态码: ${error.response?.status})`);
    }
    throw error;
  }
};

// 计算工时
export const calculateWorkHours = (
  checkIn: string,
  checkOut: string,
  lunchBreak: number
): number => {
  const [inHour, inMin] = checkIn.split(':').map(Number);
  const [outHour, outMin] = checkOut.split(':').map(Number);

  const inMinutes = inHour * 60 + inMin;
  const outMinutes = outHour * 60 + outMin;

  const workMinutes = outMinutes - inMinutes - lunchBreak * 60;
  const workHours = workMinutes / 60;

  return Math.round(workHours * 100) / 100;
};

// 格式化时间为 HH:mm
export const formatTime = (date: Date): string => {
  return date.toTimeString().slice(0, 5);
};

// 生成唯一ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
