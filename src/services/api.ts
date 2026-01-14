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

// 从环境变量或 localStorage 获取 API Key
export const getApiKey = (): string => {
  // 优先从环境变量读取
  const envApiKey = import.meta.env.VITE_SILICONFLOW_API_KEY;
  if (envApiKey) {
    return envApiKey;
  }
  // 其次从 localStorage 读取
  return localStorage.getItem('siliconflow_api_key') || '';
};

// 文本识别打卡时间
export const recognizeClockTimesFromText = async (
  text: string
): Promise<RecognizedTime[]> => {
  const prompt = `请从以下文本中提取打卡记录，识别出每天的日期和打卡时间。
请严格按照以下JSON格式返回，不要添加任何其他文字：

{
  "records": [
    {
      "date": "2024-01-13",
      "times": ["09:00:00", "12:00:00", "13:30:00", "18:00:00"]
    }
  ]
}

注意事项：
1. 如果文本中只有时间没有日期，请根据上下文推断日期
2. 如果一天有多个打卡时间，请按时间顺序排列
3. 如果无法识别日期，请标注"未知日期"
4. 时间格式为 HH:mm:ss，保留秒
5. 只返回JSON，不要返回其他内容

文本内容：
${text}`;

  const requestBody = {
    model: 'deepseek-ai/DeepSeek-V3.2',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1000,
    temperature: 0.1
  };

  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('请先配置 SiliconFlow API Key');
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
    
    // 保存原始响应用于调试（开发环境）
    if (import.meta.env.DEV) {
      console.log('API原始响应:', content);
      localStorage.setItem('debug_api_response', content);
    }
    
    // 解析JSON响应，增强容错能力
    const result = parseJsonWithRepair(content);
    if (!result || !result.records) {
      throw new Error('无法识别打卡时间，请重试');
    }
    return result.records;
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

// 识别打卡时间（图片）
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
      "times": ["09:00:00", "12:00:00", "13:30:00", "18:00:00"]
    }
  ]
}

注意事项：
1. 如果图片中只有时间没有日期，请根据文件名或上下文推断日期
2. 如果一天有多个打卡时间，请按时间顺序排列
3. 如果无法识别日期，请标注"未知日期"
4. 时间格式为 HH:mm:ss，保留秒
5. 只返回JSON，不要返回其他内容`;

  const requestBody = {
    model: 'zai-org/GLM-4.6V',
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

  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('请先配置 SiliconFlow API Key');
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
    
    // 保存原始响应用于调试（开发环境）
    if (import.meta.env.DEV) {
      console.log('API原始响应:', content);
      localStorage.setItem('debug_api_response', content);
    }
    
    // 解析JSON响应，增强容错能力
    const result = parseJsonWithRepair(content);
    if (!result || !result.records) {
      throw new Error('无法识别打卡时间，请重试');
    }
    return result.records;
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

// 修复并解析JSON，处理大模型返回的不完整或格式错误的JSON
const parseJsonWithRepair = (content: string): any => {
  // 清理内容，移除常见的markdown代码块标记
  let cleaned = content
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    // 移除GLM模型返回的特殊标记
    .replace(/<\|begin_of_box\|>\s*/g, '')
    .replace(/\s*<\|end_of_box\|>/g, '')
    .trim();

  try {
    // 尝试直接解析
    return JSON.parse(cleaned);
  } catch (e) {
    // 尝试提取JSON块
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        // JSON格式仍然错误，尝试修复常见的JSON问题
      }
    }

    // 尝试修复常见JSON格式问题
    let repaired = cleaned;

    // 1. 处理截断的JSON - 移除不完整的后缀
    // 移除不完整的行（以逗号开头，没有完整内容的行）
    repaired = repaired.replace(/,\s*["']?\s*$/gm, '');
    // 修复不完整的数组（times数组被截断的情况）
    repaired = repaired.replace(/"times":\s*\[\s*$/gm, '"times": []');
    // 移除不完整的对象属性
    repaired = repaired.replace(/,?\s*"[^"]*":\s*["']?\s*$/gm, '');
    // 移除不完整的数组元素
    repaired = repaired.replace(/,?\s*["'][^"']*["']?\s*$/gm, '');

    // 2. 修复字符串值中包含换行符或特殊字符的问题
    repaired = repaired.replace(/"([^"]*)\n([^"]*)"/g, '"$1 $2"');
    repaired = repaired.replace(/"\s+"/g, '","');

    // 3. 修复属性名后面缺少冒号的问题
    repaired = repaired.replace(/(\w)\s+(")/g, '$1: $2');

    // 4. 修复数组元素后面缺少逗号的问题
    repaired = repaired.replace(/}(\s*)\n(\s*)(")/g, '},\n$3');
    repaired = repaired.replace(/}(\s*)(")/g, '},$2');
    repaired = repaired.replace(/,(\s*)}(?!\s*[,}\]])/g, '},');

    // 5. 移除可能的尾随逗号（在对象或数组末尾）
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    // 6. 确保数组闭合
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      repaired += ']'.repeat(openBrackets - closeBrackets);
    }

    // 7. 确保对象闭合
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      repaired += '}'.repeat(openBraces - closeBraces);
    }

    // 8. 修复属性值中可能存在的未转义引号
    repaired = repaired.replace(/(":\s*)"([^"]*)"([^",}\]]*)(")/g, '$1"$2$3$4');

    try {
      return JSON.parse(repaired);
    } catch (e3) {
      // 最后尝试：使用正则提取所有完整的时间记录对象
      const objectMatches = content.match(/\{[\s\S]*?"date"[\s\S]*?"times"[\s\S]*?"[0-9]{2}:[0-9]{2}"[\s\S]*?\}/g);
      if (objectMatches && objectMatches.length > 0) {
        try {
          // 只保留有完整内容的对象（包含至少两个时间）
          const completeObjects = objectMatches.filter(obj => {
            const timeMatches = obj.match(/"[0-9]{2}:[0-9]{2}"/g);
            return timeMatches && timeMatches.length >= 2;
          });
          
          if (completeObjects.length > 0) {
            const fixedRecords = '[' + completeObjects.join(',') + ']';
            const parsed = JSON.parse(fixedRecords);
            return { records: parsed };
          }
        } catch (e4) {
          // 尝试更宽松的匹配
        }
      }

      // 备选方案：尝试找到所有包含完整date和times的对象
      try {
        // 找到"date"和它的值
        const datePattern = /"date"\s*:\s*"(\d{4}-\d{2}-\d{2})"/g;
        const timesPattern = /"times"\s*:\s*\[([\s\S]*?)\]/g;
        
        const records: Array<{ date: string; times: string[] }> = [];
        let match;
        
        while ((match = datePattern.exec(cleaned)) !== null) {
          const date = match[1];
          const dateIndex = match.index;
          
          // 找到对应的times数组
          const remainingContent = cleaned.substring(dateIndex);
          const timesMatch = timesPattern.exec(remainingContent);
          
          if (timesMatch) {
            // 解析times数组
            const timesContent = timesMatch[1];
            const times: string[] = [];
            const timeValuePattern = /"([0-9]{2}:[0-9]{2}(?::[0-9]{2})?)"/g;
            let timeMatch;
            
            while ((timeMatch = timeValuePattern.exec(timesContent)) !== null) {
              times.push(timeMatch[1]);
            }
            
            if (times.length >= 2) {
              records.push({ date, times });
            }
          }
        }
        
        if (records.length > 0) {
          return { records };
        }
      } catch (e5) {
        // 解析失败，继续
      }

      throw new Error('JSON解析失败');
    }
  }
};
