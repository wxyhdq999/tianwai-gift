// Dates supplied by the gift creator. Add recovered shows here; venue names are unconfirmed.
export const cities = [
  {
    "id": "zunyi",
    "name": "遵义",
    "en": "ZUNYI",
    "x": 28,
    "y": 37,
    "shows": [
      "2023.08.26"
    ],
    "photos": {
      "2023.08.26": {
        "backCaption": "听说那天倾盆大雨",
        "front": "./assets/photos/2023-08-26-zunyi/front.jpg",
        "back": "./assets/photos/2023-08-26-zunyi/back.jpg"
      }
    }
  },
  {
    "id": "changzhou",
    "name": "常州",
    "en": "CHANGZHOU",
    "x": 81,
    "y": 32,
    "shows": [
      "2023.10.21"
    ],
    "photos": {
      "2023.10.21": {
        "backCaption": "凌晨两点的鱿鱼丝",
        "front": "./assets/photos/2023-10-21-changzhou/front.jpg",
        "back": "./assets/photos/2023-10-21-changzhou/back.jpg"
      }
    }
  },
  {
    "id": "qujing",
    "name": "曲靖",
    "en": "QUJING",
    "x": 20,
    "y": 72,
    "shows": [
      "2024.01.13"
    ],
    "photos": {
      "2024.01.13": {
        "backCaption": "这张真的很有氛围感啊啊啊",
        "front": "./assets/photos/2024-01-13-qujing/front.jpg",
        "back": "./assets/photos/2024-01-13-qujing/back.jpg"
      }
    }
  },
  {
    "id": "nanjing",
    "name": "南京",
    "en": "NANJING",
    "x": 65,
    "y": 18,
    "shows": [
      "2026.05.29"
    ],
    "photos": {
      "2026.05.29": {
        "backCaption": "我翻聊天记录看到这个实在是太好笑了，你说你五点才睡",
        "front": "./assets/photos/2026-05-30-nanjing/front.jpg",
        "back": "./assets/photos/2026-05-30-nanjing/back.jpg"
      }
    }
  },
  {
    "id": "chongqing",
    "name": "重庆",
    "en": "CHONGQING",
    "x": 42,
    "y": 20,
    "shows": [
      "2026.06.26"
    ],
    "photos": {
      "2026.06.26": {
        "backCaption": "哦哦特得",
        "front": "./assets/photos/2026-06-26-chongqing/front.jpg",
        "back": "./assets/photos/2026-06-26-chongqing/back.jpg"
      }
    }
  },
  {
    "id": "shenzhen",
    "name": "深圳",
    "en": "SHENZHEN",
    "x": 70,
    "y": 84,
    "shows": [
      "2026.08.29",
      "2026.08.30"
    ],
    "photos": {
      "2026.08.29": {
        "front": "./assets/photos/2026-08-29-shenzhen/front.jpg",
        "back": "./assets/photos/2026-08-29-shenzhen/back.jpg"
      },
      "2026.08.30": {
        "front": "./assets/photos/2026-08-30-shenzhen/front.jpg",
        "back": "./assets/photos/2026-08-30-shenzhen/back.jpg"
      }
    }
  },
  {
    "id": "guiyang",
    "name": "贵阳",
    "en": "GUIYANG",
    "x": 43,
    "y": 58,
    "shows": [
      "2026.10.24",
      "2026.10.25"
    ],
    "photos": {
      "2026.10.24": {
        "front": "./assets/photos/2026-10-24-guiyang/front.jpg",
        "back": "./assets/photos/2026-10-24-guiyang/back.jpg"
      },
      "2026.10.25": {
        "backCaption": "好巧你俩衣服颜色一样",
        "front": "./assets/photos/2026-10-25-guiyang/front.jpg",
        "back": "./assets/photos/2026-10-25-guiyang/back.jpg"
      }
    }
  }
];
export const allRecords = cities.flatMap(city => city.shows.map(date => ({ id: `${city.id}:${date}`, date, city: city.name, cityId: city.id, photos: { ...city.photos[date], thumbnail: city.photos[date].front.replace('front.jpg', 'front-thumb.jpg') } })));
export const total = allRecords.length;
export function cleanProgress(value) {
  return [...new Set(Array.isArray(value) ? value.filter(id => allRecords.some(record => record.id === id)) : [])];
}
export const isArchived = ids => cleanProgress(ids).length === total;
export function orderedCorrectly(ids) {
  const sorted = [...allRecords].sort((a, b) => a.date.localeCompare(b.date)).map(record => record.id);
  return Array.isArray(ids) && ids.length === sorted.length && sorted.every((id, index) => id === ids[index]);
}
