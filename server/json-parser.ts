import { transformExternalMedia, type ExternalMedia } from "@shared/schema";

interface RawMediaData {
  id: string | number;
  title: string;
  poster: string;
  backdrop?: string;
  watchUrl?: string;
  trailerUrl?: string;
  description?: string;
  year: string | number;
  duration?: string | null;
  rating?: string;
  category?: string;
  type: string;
  isNew?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  episodes?: any[];
  servers?: Array<{
    name: string;
    url: string;
  }>;
}

export class JSONParser {
  /**
   * تنظيف وتحليل النص المختلط JavaScript/JSON
   */
  static cleanAndParseJSONText(rawText: string): RawMediaData[] {
    try {
      // إزالة التعليقات
      let cleanText = rawText.replace(/\/\/.*$/gm, '');
      
      // إضافة علامات اقتباس للمفاتيح غير المقتبسة
      cleanText = cleanText.replace(/(\w+):/g, '"$1":');
      
      // إصلاح علامات الاقتباس المفردة
      cleanText = cleanText.replace(/'/g, '"');
      
      // إزالة الفواصل الزائدة
      cleanText = cleanText.replace(/,(\s*[}\]])/g, '$1');
      
      // التعامل مع البداية والنهاية
      cleanText = cleanText.trim();
      if (cleanText.startsWith('},')) {
        cleanText = cleanText.substring(2);
      }
      if (cleanText.endsWith(',')) {
        cleanText = cleanText.slice(0, -1);
      }
      
      // محاولة تحويل النص إلى مصفوفة صالحة
      if (!cleanText.startsWith('[')) {
        cleanText = '[' + cleanText + ']';
      }
      
      // تحليل JSON
      const parsed = JSON.parse(cleanText);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('خطأ في تحليل JSON:', error);
      return [];
    }
  }

  /**
   * استخراج البيانات من ملف نصي مختلط
   */
  static extractMediaFromFile(fileContent: string): RawMediaData[] {
    const items: RawMediaData[] = [];
    
    try {
      // تنظيف المحتوى أولاً
      let cleanContent = fileContent.trim();
      
      // إزالة التعليقات
      cleanContent = cleanContent.replace(/\/\/.*$/gm, '');
      
      // إزالة الفواصل والأقواس الزائدة في البداية (بما في ذلك },)
      cleanContent = cleanContent.replace(/^[},\s\[\]]+/, '');
      
      // إزالة الفواصل والأقواس الزائدة في النهاية
      cleanContent = cleanContent.replace(/[,}\s\[\]]+$/, '');
      
      // إضافة أقواس مربعة لجعلها مصفوفة صالحة
      if (!cleanContent.startsWith('[')) {
        cleanContent = `[${cleanContent}]`;
      }
      
      // محاولة تحليل الكل كـ JSON أولاً
      try {
        const parsed = JSON.parse(cleanContent);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => item && (item.id || item.title));
        }
        return [parsed].filter(item => item && (item.id || item.title));
      } catch (e) {
        console.log('فشل في تحليل JSON الكامل، جاري التحليل المتقطع...');
      }
      
      // إذا فشل التحليل الكامل، استخدم التحليل المتقطع
      const lines = fileContent.split('\n');
      let currentItem = '';
      let braceCount = 0;
      let inObject = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // تجاهل التعليقات والأسطر الفارغة
        if (trimmedLine.startsWith('//') || trimmedLine === '' || trimmedLine === '},') {
          continue;
        }
        
        // بداية كائن جديد
        if (trimmedLine.includes('{') && !trimmedLine.startsWith('}')) {
          inObject = true;
          currentItem = '';
          braceCount = 0;
        }
        
        if (inObject) {
          currentItem += line + '\n';
          
          // حساب الأقواس
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;
          
          // انتهاء الكائن
          if (braceCount === 0 && currentItem.trim().length > 0) {
            const cleanedItem = this.cleanObjectString(currentItem);
            if (cleanedItem) {
              try {
                const parsed = JSON.parse(cleanedItem);
                if (parsed && (parsed.id || parsed.title)) {
                  // إضافة ID إذا لم يكن موجوداً
                  if (!parsed.id && parsed.title) {
                    parsed.id = parsed.title.replace(/\s+/g, '-').toLowerCase();
                  }
                  items.push(parsed);
                }
              } catch (e) {
                console.warn('تجاهل عنصر غير صالح:', e);
                console.warn('المحتوى:', cleanedItem.substring(0, 100));
              }
            }
            currentItem = '';
            inObject = false;
          }
        }
      }
      
      return items;
    } catch (error) {
      console.error('خطأ في استخراج البيانات:', error);
      return [];
    }
  }

  /**
   * إصلاح تنسيق JSON
   */
  private static fixJSONFormat(jsonString: string): string {
    let fixed = jsonString;
    
    // إصلاح المفاتيح غير المقتبسة
    fixed = fixed.replace(/(\w+):/g, '"$1":');
    
    // إصلاح القيم غير المقتبسة (ما عدا الأرقام والبوليان والـ null)
    fixed = fixed.replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}\n])/g, (match, value, ending) => {
      if (['true', 'false', 'null'].includes(value)) {
        return `: ${value}${ending}`;
      }
      return `: "${value}"${ending}`;
    });
    
    // إزالة الفواصل الزائدة قبل إغلاق الأقواس
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    return fixed;
  }

  /**
   * تنظيف نص كائن واحد
   */
  private static cleanObjectString(objectStr: string): string {
    try {
      let cleaned = objectStr.trim();
      
      // إزالة التعليقات
      cleaned = cleaned.replace(/\/\/.*$/gm, '');
      
      // إزالة الفواصل الزائدة والأقواس
      cleaned = cleaned.replace(/^[,}\s]+/, '').replace(/[,}\s]+$/, '');
      
      // إضافة علامات اقتباس للمفاتيح
      cleaned = cleaned.replace(/(\w+)(\s*):/g, '"$1"$2:');
      
      // إصلاح القيم غير المقتبسة (ما عدا الأرقام والبوليان)
      cleaned = cleaned.replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}\n])/g, (match, value, ending) => {
        if (['true', 'false', 'null'].includes(value)) {
          return `: ${value}${ending}`;
        }
        return `: "${value}"${ending}`;
      });
      
      // إصلاح النصوص المقطوعة
      cleaned = cleaned.replace(/\.\.\.\[Truncated\]/g, '...');
      
      // إضافة أقواس إذا لم تكن موجودة
      if (!cleaned.startsWith('{')) {
        cleaned = '{' + cleaned;
      }
      if (!cleaned.endsWith('}')) {
        cleaned = cleaned + '}';
      }
      
      // إزالة الفواصل الزائدة قبل الإغلاق
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
      
      return cleaned;
    } catch (error) {
      console.error('خطأ في تنظيف النص:', error);
      return '';
    }
  }

  /**
   * تحويل البيانات الخام إلى تنسيق قاعدة البيانات
   */
  static transformToInternalFormat(rawData: RawMediaData[]): ExternalMedia[] {
    return rawData.map(item => {
      // تنظيف وتوحيد البيانات
      const cleaned: any = {
        id: String(item.id),
        title: item.title,
        poster: item.poster || '',
        backdrop: item.backdrop || null,
        description: item.description || '',
        year: String(item.year),
        duration: item.duration || null,
        rating: item.rating || null,
        category: item.category || '',
        type: this.normalizeType(item.type),
        isNew: Boolean(item.isNew),
        isPopular: Boolean(item.isPopular),
        isFeatured: Boolean(item.isFeatured),
        trailerUrl: item.trailerUrl || '',
        episodes: item.episodes || null
      };

      // إضافة servers للأفلام
      if (item.servers && !item.episodes) {
        cleaned.servers = item.servers;
      }

      return cleaned;
    });
  }

  /**
   * توحيد أنواع الوسائط
   */
  private static normalizeType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'series': 'series',
      'movie': 'movie',
      'anime': 'anime',
      'foreign_series': 'foreign_series',
      'asian_series': 'asian_series',
      'anime_movie': 'anime_movie'
    };

    return typeMap[type.toLowerCase()] || type;
  }

  /**
   * تصدير البيانات بتنسيق JSON نظيف
   */
  static exportToCleanJSON(data: any[]): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * التحقق من صحة بيانات JSON
   */
  static validateJSONData(jsonString: string): { isValid: boolean; error?: string; data?: any[] } {
    try {
      const parsed = JSON.parse(jsonString);
      const dataArray = Array.isArray(parsed) ? parsed : [parsed];
      
      // التحقق من الحقول المطلوبة
      for (const item of dataArray) {
        if (!item.id || !item.title || !item.type) {
          return {
            isValid: false,
            error: 'عنصر يفتقر للحقول المطلوبة (id, title, type)'
          };
        }
      }
      
      return {
        isValid: true,
        data: dataArray
      };
    } catch (error) {
      return {
        isValid: false,
        error: `خطأ في تحليل JSON: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
      };
    }
  }
}