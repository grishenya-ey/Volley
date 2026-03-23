/**
 * Справочник данных приложения для сопоставления с полями vMix (vmix-data-map).
 * Иерархический список с человекопонятными названиями; фильтрация по типу поля.
 */

export type DataMapItemType = 'text' | 'color' | 'image' | 'visibility';

export interface DataMapItem {
  key: string;
  label: string;
  type: DataMapItemType;
}

export interface DataMapGroup {
  id: string;
  label: string;
  items: DataMapItem[];
}

export type DataMapCatalogFieldType = 'text' | 'color' | 'image';

export interface GetDataMapCatalogOptions {
  fieldType?: DataMapCatalogFieldType;
}

const DATA_MAP_GROUPS: DataMapGroup[] = [
  {
    id: 'tournament',
    label: 'Турнир',
    items: [
      { key: 'tournament', label: 'Название турнира', type: 'text' },
      { key: 'tournamentSubtitle', label: 'Подзаголовок турнира', type: 'text' },
    ],
  },
  {
    id: 'venue',
    label: 'Место и время',
    items: [
      { key: 'location', label: 'Город / страна', type: 'text' },
      { key: 'venue', label: 'Место проведения', type: 'text' },
      { key: 'date', label: 'Дата', type: 'text' },
      { key: 'time', label: 'Время', type: 'text' },
      { key: 'matchDate', label: 'Дата и время (форматированные)', type: 'text' },
    ],
  },
  {
    id: 'teams',
    label: 'Команды',
    items: [
      { key: 'teamA.name', label: 'Название команды A', type: 'text' },
      { key: 'teamA.city', label: 'Город команды A', type: 'text' },
      { key: 'teamA.color', label: 'Цвет команды A', type: 'color' },
      { key: 'teamA.liberoColor', label: 'Цвет либеро команды A', type: 'color' },
      { key: 'teamA.logo', label: 'Логотип команды A', type: 'image' },
      { key: 'teamA.logoPath', label: 'Путь к логотипу A', type: 'image' },
      { key: 'teamA.coach', label: 'Тренер команды A', type: 'text' },
      { key: 'teamB.name', label: 'Название команды B', type: 'text' },
      { key: 'teamB.city', label: 'Город команды B', type: 'text' },
      { key: 'teamB.color', label: 'Цвет команды B', type: 'color' },
      { key: 'teamB.liberoColor', label: 'Цвет либеро команды B', type: 'color' },
      { key: 'teamB.logo', label: 'Логотип команды B', type: 'image' },
      { key: 'teamB.logoPath', label: 'Путь к логотипу B', type: 'image' },
      { key: 'teamB.coach', label: 'Тренер команды B', type: 'text' },
    ],
  },
  {
    id: 'score',
    label: 'Счёт',
    items: [
      { key: 'currentSet.scoreA', label: 'Счёт команды A в партии', type: 'text' },
      { key: 'currentSet.scoreB', label: 'Счёт команды B в партии', type: 'text' },
      { key: 'scoreASets', label: 'Счёт по партиям (команда A)', type: 'text' },
      { key: 'scoreBSets', label: 'Счёт по партиям (команда B)', type: 'text' },
      { key: 'servingTeam', label: 'Команда на подаче (A/B)', type: 'text' },
      { key: 'visibility.pointA', label: 'Индикатор подачи команды A', type: 'visibility' },
      { key: 'visibility.pointB', label: 'Индикатор подачи команды B', type: 'visibility' },
    ],
  },
  {
    id: 'officials',
    label: 'Судьи и официальные лица',
    items: [
      { key: 'officials.referee1', label: 'Первый судья', type: 'text' },
      { key: 'officials.referee2', label: 'Второй судья', type: 'text' },
      { key: 'officials.lineJudge1', label: 'Линейный судья 1', type: 'text' },
      { key: 'officials.lineJudge2', label: 'Линейный судья 2', type: 'text' },
      { key: 'officials.scorer', label: 'Секретарь', type: 'text' },
    ],
  },
  {
    id: 'roster',
    label: 'Составы (номера, имена, позиции)',
    items: [
      { key: 'rosterA.player1Number', label: 'Состав A: номер 1', type: 'text' },
      { key: 'rosterA.player1Name', label: 'Состав A: имя 1', type: 'text' },
      { key: 'rosterA.player1Position', label: 'Состав A: позиция 1 (полное)', type: 'text' },
      { key: 'rosterA.player1PositionShort', label: 'Состав A: позиция 1 (сокр. OH/MB/OPP/S/L)', type: 'text' },
      { key: 'rosterA.player2Number', label: 'Состав A: номер 2', type: 'text' },
      { key: 'rosterA.player2Name', label: 'Состав A: имя 2', type: 'text' },
      { key: 'rosterA.player2Position', label: 'Состав A: позиция 2 (полное)', type: 'text' },
      { key: 'rosterA.player2PositionShort', label: 'Состав A: позиция 2 (сокр.)', type: 'text' },
      { key: 'rosterA.player3Number', label: 'Состав A: номер 3', type: 'text' },
      { key: 'rosterA.player3Name', label: 'Состав A: имя 3', type: 'text' },
      { key: 'rosterA.player3Position', label: 'Состав A: позиция 3 (полное)', type: 'text' },
      { key: 'rosterA.player3PositionShort', label: 'Состав A: позиция 3 (сокр.)', type: 'text' },
      { key: 'rosterA.player4Number', label: 'Состав A: номер 4', type: 'text' },
      { key: 'rosterA.player4Name', label: 'Состав A: имя 4', type: 'text' },
      { key: 'rosterA.player4Position', label: 'Состав A: позиция 4 (полное)', type: 'text' },
      { key: 'rosterA.player4PositionShort', label: 'Состав A: позиция 4 (сокр.)', type: 'text' },
      { key: 'rosterA.player5Number', label: 'Состав A: номер 5', type: 'text' },
      { key: 'rosterA.player5Name', label: 'Состав A: имя 5', type: 'text' },
      { key: 'rosterA.player5Position', label: 'Состав A: позиция 5 (полное)', type: 'text' },
      { key: 'rosterA.player5PositionShort', label: 'Состав A: позиция 5 (сокр.)', type: 'text' },
      { key: 'rosterA.player6Number', label: 'Состав A: номер 6', type: 'text' },
      { key: 'rosterA.player6Name', label: 'Состав A: имя 6', type: 'text' },
      { key: 'rosterA.player6Position', label: 'Состав A: позиция 6 (полное)', type: 'text' },
      { key: 'rosterA.player6PositionShort', label: 'Состав A: позиция 6 (сокр.)', type: 'text' },
      { key: 'rosterA.player7Number', label: 'Состав A: номер 7', type: 'text' },
      { key: 'rosterA.player7Name', label: 'Состав A: имя 7', type: 'text' },
      { key: 'rosterA.player7Position', label: 'Состав A: позиция 7 (полное)', type: 'text' },
      { key: 'rosterA.player7PositionShort', label: 'Состав A: позиция 7 (сокр.)', type: 'text' },
      { key: 'rosterA.player8Number', label: 'Состав A: номер 8', type: 'text' },
      { key: 'rosterA.player8Name', label: 'Состав A: имя 8', type: 'text' },
      { key: 'rosterA.player8Position', label: 'Состав A: позиция 8 (полное)', type: 'text' },
      { key: 'rosterA.player8PositionShort', label: 'Состав A: позиция 8 (сокр.)', type: 'text' },
      { key: 'rosterA.player9Number', label: 'Состав A: номер 9', type: 'text' },
      { key: 'rosterA.player9Name', label: 'Состав A: имя 9', type: 'text' },
      { key: 'rosterA.player9Position', label: 'Состав A: позиция 9 (полное)', type: 'text' },
      { key: 'rosterA.player9PositionShort', label: 'Состав A: позиция 9 (сокр.)', type: 'text' },
      { key: 'rosterA.player10Number', label: 'Состав A: номер 10', type: 'text' },
      { key: 'rosterA.player10Name', label: 'Состав A: имя 10', type: 'text' },
      { key: 'rosterA.player10Position', label: 'Состав A: позиция 10 (полное)', type: 'text' },
      { key: 'rosterA.player10PositionShort', label: 'Состав A: позиция 10 (сокр.)', type: 'text' },
      { key: 'rosterA.player11Number', label: 'Состав A: номер 11', type: 'text' },
      { key: 'rosterA.player11Name', label: 'Состав A: имя 11', type: 'text' },
      { key: 'rosterA.player11Position', label: 'Состав A: позиция 11 (полное)', type: 'text' },
      { key: 'rosterA.player11PositionShort', label: 'Состав A: позиция 11 (сокр.)', type: 'text' },
      { key: 'rosterA.player12Number', label: 'Состав A: номер 12', type: 'text' },
      { key: 'rosterA.player12Name', label: 'Состав A: имя 12', type: 'text' },
      { key: 'rosterA.player12Position', label: 'Состав A: позиция 12 (полное)', type: 'text' },
      { key: 'rosterA.player12PositionShort', label: 'Состав A: позиция 12 (сокр.)', type: 'text' },
      { key: 'rosterA.player13Number', label: 'Состав A: номер 13', type: 'text' },
      { key: 'rosterA.player13Name', label: 'Состав A: имя 13', type: 'text' },
      { key: 'rosterA.player13Position', label: 'Состав A: позиция 13 (полное)', type: 'text' },
      { key: 'rosterA.player13PositionShort', label: 'Состав A: позиция 13 (сокр.)', type: 'text' },
      { key: 'rosterA.player14Number', label: 'Состав A: номер 14', type: 'text' },
      { key: 'rosterA.player14Name', label: 'Состав A: имя 14', type: 'text' },
      { key: 'rosterA.player14Position', label: 'Состав A: позиция 14 (полное)', type: 'text' },
      { key: 'rosterA.player14PositionShort', label: 'Состав A: позиция 14 (сокр.)', type: 'text' },
      { key: 'rosterB.player1Number', label: 'Состав B: номер 1', type: 'text' },
      { key: 'rosterB.player1Name', label: 'Состав B: имя 1', type: 'text' },
      { key: 'rosterB.player1Position', label: 'Состав B: позиция 1 (полное)', type: 'text' },
      { key: 'rosterB.player1PositionShort', label: 'Состав B: позиция 1 (сокр.)', type: 'text' },
      { key: 'rosterB.player2Number', label: 'Состав B: номер 2', type: 'text' },
      { key: 'rosterB.player2Name', label: 'Состав B: имя 2', type: 'text' },
      { key: 'rosterB.player2Position', label: 'Состав B: позиция 2 (полное)', type: 'text' },
      { key: 'rosterB.player2PositionShort', label: 'Состав B: позиция 2 (сокр.)', type: 'text' },
      { key: 'rosterB.player3Number', label: 'Состав B: номер 3', type: 'text' },
      { key: 'rosterB.player3Name', label: 'Состав B: имя 3', type: 'text' },
      { key: 'rosterB.player3Position', label: 'Состав B: позиция 3 (полное)', type: 'text' },
      { key: 'rosterB.player3PositionShort', label: 'Состав B: позиция 3 (сокр.)', type: 'text' },
      { key: 'rosterB.player4Number', label: 'Состав B: номер 4', type: 'text' },
      { key: 'rosterB.player4Name', label: 'Состав B: имя 4', type: 'text' },
      { key: 'rosterB.player4Position', label: 'Состав B: позиция 4 (полное)', type: 'text' },
      { key: 'rosterB.player4PositionShort', label: 'Состав B: позиция 4 (сокр.)', type: 'text' },
      { key: 'rosterB.player5Number', label: 'Состав B: номер 5', type: 'text' },
      { key: 'rosterB.player5Name', label: 'Состав B: имя 5', type: 'text' },
      { key: 'rosterB.player5Position', label: 'Состав B: позиция 5 (полное)', type: 'text' },
      { key: 'rosterB.player5PositionShort', label: 'Состав B: позиция 5 (сокр.)', type: 'text' },
      { key: 'rosterB.player6Number', label: 'Состав B: номер 6', type: 'text' },
      { key: 'rosterB.player6Name', label: 'Состав B: имя 6', type: 'text' },
      { key: 'rosterB.player6Position', label: 'Состав B: позиция 6 (полное)', type: 'text' },
      { key: 'rosterB.player6PositionShort', label: 'Состав B: позиция 6 (сокр.)', type: 'text' },
      { key: 'rosterB.player7Number', label: 'Состав B: номер 7', type: 'text' },
      { key: 'rosterB.player7Name', label: 'Состав B: имя 7', type: 'text' },
      { key: 'rosterB.player7Position', label: 'Состав B: позиция 7 (полное)', type: 'text' },
      { key: 'rosterB.player7PositionShort', label: 'Состав B: позиция 7 (сокр.)', type: 'text' },
      { key: 'rosterB.player8Number', label: 'Состав B: номер 8', type: 'text' },
      { key: 'rosterB.player8Name', label: 'Состав B: имя 8', type: 'text' },
      { key: 'rosterB.player8Position', label: 'Состав B: позиция 8 (полное)', type: 'text' },
      { key: 'rosterB.player8PositionShort', label: 'Состав B: позиция 8 (сокр.)', type: 'text' },
      { key: 'rosterB.player9Number', label: 'Состав B: номер 9', type: 'text' },
      { key: 'rosterB.player9Name', label: 'Состав B: имя 9', type: 'text' },
      { key: 'rosterB.player9Position', label: 'Состав B: позиция 9 (полное)', type: 'text' },
      { key: 'rosterB.player9PositionShort', label: 'Состав B: позиция 9 (сокр.)', type: 'text' },
      { key: 'rosterB.player10Number', label: 'Состав B: номер 10', type: 'text' },
      { key: 'rosterB.player10Name', label: 'Состав B: имя 10', type: 'text' },
      { key: 'rosterB.player10Position', label: 'Состав B: позиция 10 (полное)', type: 'text' },
      { key: 'rosterB.player10PositionShort', label: 'Состав B: позиция 10 (сокр.)', type: 'text' },
      { key: 'rosterB.player11Number', label: 'Состав B: номер 11', type: 'text' },
      { key: 'rosterB.player11Name', label: 'Состав B: имя 11', type: 'text' },
      { key: 'rosterB.player11Position', label: 'Состав B: позиция 11 (полное)', type: 'text' },
      { key: 'rosterB.player11PositionShort', label: 'Состав B: позиция 11 (сокр.)', type: 'text' },
      { key: 'rosterB.player12Number', label: 'Состав B: номер 12', type: 'text' },
      { key: 'rosterB.player12Name', label: 'Состав B: имя 12', type: 'text' },
      { key: 'rosterB.player12Position', label: 'Состав B: позиция 12 (полное)', type: 'text' },
      { key: 'rosterB.player12PositionShort', label: 'Состав B: позиция 12 (сокр.)', type: 'text' },
      { key: 'rosterB.player13Number', label: 'Состав B: номер 13', type: 'text' },
      { key: 'rosterB.player13Name', label: 'Состав B: имя 13', type: 'text' },
      { key: 'rosterB.player13Position', label: 'Состав B: позиция 13 (полное)', type: 'text' },
      { key: 'rosterB.player13PositionShort', label: 'Состав B: позиция 13 (сокр.)', type: 'text' },
      { key: 'rosterB.player14Number', label: 'Состав B: номер 14', type: 'text' },
      { key: 'rosterB.player14Name', label: 'Состав B: имя 14', type: 'text' },
      { key: 'rosterB.player14Position', label: 'Состав B: позиция 14 (полное)', type: 'text' },
      { key: 'rosterB.player14PositionShort', label: 'Состав B: позиция 14 (сокр.)', type: 'text' },
    ],
  },
  {
    id: 'startingLineup',
    label: 'Стартовый состав и либеро',
    items: [
      { key: 'startingA.player1Number', label: 'Старт A: номер 1', type: 'text' },
      { key: 'startingA.player1Name', label: 'Старт A: имя 1', type: 'text' },
      { key: 'startingA.player1Position', label: 'Старт A: позиция 1 (полное)', type: 'text' },
      { key: 'startingA.player1PositionShort', label: 'Старт A: позиция 1 (сокр.)', type: 'text' },
      { key: 'startingA.player2Number', label: 'Старт A: номер 2', type: 'text' },
      { key: 'startingA.player2Name', label: 'Старт A: имя 2', type: 'text' },
      { key: 'startingA.player2Position', label: 'Старт A: позиция 2 (полное)', type: 'text' },
      { key: 'startingA.player2PositionShort', label: 'Старт A: позиция 2 (сокр.)', type: 'text' },
      { key: 'startingA.player3Number', label: 'Старт A: номер 3', type: 'text' },
      { key: 'startingA.player3Name', label: 'Старт A: имя 3', type: 'text' },
      { key: 'startingA.player3Position', label: 'Старт A: позиция 3 (полное)', type: 'text' },
      { key: 'startingA.player3PositionShort', label: 'Старт A: позиция 3 (сокр.)', type: 'text' },
      { key: 'startingA.player4Number', label: 'Старт A: номер 4', type: 'text' },
      { key: 'startingA.player4Name', label: 'Старт A: имя 4', type: 'text' },
      { key: 'startingA.player4Position', label: 'Старт A: позиция 4 (полное)', type: 'text' },
      { key: 'startingA.player4PositionShort', label: 'Старт A: позиция 4 (сокр.)', type: 'text' },
      { key: 'startingA.player5Number', label: 'Старт A: номер 5', type: 'text' },
      { key: 'startingA.player5Name', label: 'Старт A: имя 5', type: 'text' },
      { key: 'startingA.player5Position', label: 'Старт A: позиция 5 (полное)', type: 'text' },
      { key: 'startingA.player5PositionShort', label: 'Старт A: позиция 5 (сокр.)', type: 'text' },
      { key: 'startingA.player6Number', label: 'Старт A: номер 6', type: 'text' },
      { key: 'startingA.player6Name', label: 'Старт A: имя 6', type: 'text' },
      { key: 'startingA.player6Position', label: 'Старт A: позиция 6 (полное)', type: 'text' },
      { key: 'startingA.player6PositionShort', label: 'Старт A: позиция 6 (сокр.)', type: 'text' },
      { key: 'startingA.libero1Number', label: 'Старт A: либеро 1 номер', type: 'text' },
      { key: 'startingA.libero1Name', label: 'Старт A: либеро 1 имя', type: 'text' },
      { key: 'startingA.libero1Position', label: 'Старт A: либеро 1 позиция (полное)', type: 'text' },
      { key: 'startingA.libero1PositionShort', label: 'Старт A: либеро 1 позиция (сокр.)', type: 'text' },
      { key: 'startingA.libero1Background', label: 'Старт A: подложка либеро 1', type: 'color' },
      { key: 'startingA.libero2Number', label: 'Старт A: либеро 2 номер', type: 'text' },
      { key: 'startingA.libero2Name', label: 'Старт A: либеро 2 имя', type: 'text' },
      { key: 'startingA.libero2Position', label: 'Старт A: либеро 2 позиция (полное)', type: 'text' },
      { key: 'startingA.libero2PositionShort', label: 'Старт A: либеро 2 позиция (сокр.)', type: 'text' },
      { key: 'startingA.libero2Background', label: 'Старт A: подложка либеро 2', type: 'color' },
      { key: 'startingB.player1Number', label: 'Старт B: номер 1', type: 'text' },
      { key: 'startingB.player1Name', label: 'Старт B: имя 1', type: 'text' },
      { key: 'startingB.player1Position', label: 'Старт B: позиция 1 (полное)', type: 'text' },
      { key: 'startingB.player1PositionShort', label: 'Старт B: позиция 1 (сокр.)', type: 'text' },
      { key: 'startingB.player2Number', label: 'Старт B: номер 2', type: 'text' },
      { key: 'startingB.player2Name', label: 'Старт B: имя 2', type: 'text' },
      { key: 'startingB.player2Position', label: 'Старт B: позиция 2 (полное)', type: 'text' },
      { key: 'startingB.player2PositionShort', label: 'Старт B: позиция 2 (сокр.)', type: 'text' },
      { key: 'startingB.player3Number', label: 'Старт B: номер 3', type: 'text' },
      { key: 'startingB.player3Name', label: 'Старт B: имя 3', type: 'text' },
      { key: 'startingB.player3Position', label: 'Старт B: позиция 3 (полное)', type: 'text' },
      { key: 'startingB.player3PositionShort', label: 'Старт B: позиция 3 (сокр.)', type: 'text' },
      { key: 'startingB.player4Number', label: 'Старт B: номер 4', type: 'text' },
      { key: 'startingB.player4Name', label: 'Старт B: имя 4', type: 'text' },
      { key: 'startingB.player4Position', label: 'Старт B: позиция 4 (полное)', type: 'text' },
      { key: 'startingB.player4PositionShort', label: 'Старт B: позиция 4 (сокр.)', type: 'text' },
      { key: 'startingB.player5Number', label: 'Старт B: номер 5', type: 'text' },
      { key: 'startingB.player5Name', label: 'Старт B: имя 5', type: 'text' },
      { key: 'startingB.player5Position', label: 'Старт B: позиция 5 (полное)', type: 'text' },
      { key: 'startingB.player5PositionShort', label: 'Старт B: позиция 5 (сокр.)', type: 'text' },
      { key: 'startingB.player6Number', label: 'Старт B: номер 6', type: 'text' },
      { key: 'startingB.player6Name', label: 'Старт B: имя 6', type: 'text' },
      { key: 'startingB.player6Position', label: 'Старт B: позиция 6 (полное)', type: 'text' },
      { key: 'startingB.player6PositionShort', label: 'Старт B: позиция 6 (сокр.)', type: 'text' },
      { key: 'startingB.libero1Number', label: 'Старт B: либеро 1 номер', type: 'text' },
      { key: 'startingB.libero1Name', label: 'Старт B: либеро 1 имя', type: 'text' },
      { key: 'startingB.libero1Position', label: 'Старт B: либеро 1 позиция (полное)', type: 'text' },
      { key: 'startingB.libero1PositionShort', label: 'Старт B: либеро 1 позиция (сокр.)', type: 'text' },
      { key: 'startingB.libero1Background', label: 'Старт B: подложка либеро 1', type: 'color' },
      { key: 'startingB.libero2Number', label: 'Старт B: либеро 2 номер', type: 'text' },
      { key: 'startingB.libero2Name', label: 'Старт B: либеро 2 имя', type: 'text' },
      { key: 'startingB.libero2Position', label: 'Старт B: либеро 2 позиция (полное)', type: 'text' },
      { key: 'startingB.libero2PositionShort', label: 'Старт B: либеро 2 позиция (сокр.)', type: 'text' },
      { key: 'startingB.libero2Background', label: 'Старт B: подложка либеро 2', type: 'color' },
    ],
  },
  {
    id: 'sets',
    label: 'Партии (счёт и длительность)',
    items: [
      { key: 'set1.scoreA', label: 'Партия 1: счёт A', type: 'text' },
      { key: 'set1.scoreB', label: 'Партия 1: счёт B', type: 'text' },
      { key: 'set1.duration', label: 'Партия 1: длительность', type: 'text' },
      { key: 'set2.scoreA', label: 'Партия 2: счёт A', type: 'text' },
      { key: 'set2.scoreB', label: 'Партия 2: счёт B', type: 'text' },
      { key: 'set2.duration', label: 'Партия 2: длительность', type: 'text' },
      { key: 'set3.scoreA', label: 'Партия 3: счёт A', type: 'text' },
      { key: 'set3.scoreB', label: 'Партия 3: счёт B', type: 'text' },
      { key: 'set3.duration', label: 'Партия 3: длительность', type: 'text' },
      { key: 'set4.scoreA', label: 'Партия 4: счёт A', type: 'text' },
      { key: 'set4.scoreB', label: 'Партия 4: счёт B', type: 'text' },
      { key: 'set4.duration', label: 'Партия 4: длительность', type: 'text' },
      { key: 'set5.scoreA', label: 'Партия 5: счёт A', type: 'text' },
      { key: 'set5.scoreB', label: 'Партия 5: счёт B', type: 'text' },
      { key: 'set5.duration', label: 'Партия 5: длительность', type: 'text' },
    ],
  },
  {
    id: 'statistics',
    label: 'Расширенная статистика',
    items: [
      { key: 'statistics.teamA.attack', label: 'Статистика A: атака', type: 'text' },
      { key: 'statistics.teamA.block', label: 'Статистика A: блок', type: 'text' },
      { key: 'statistics.teamA.serve', label: 'Статистика A: подачи', type: 'text' },
      { key: 'statistics.teamA.opponentErrors', label: 'Статистика A: ошибки соперника', type: 'text' },
      { key: 'statistics.teamB.attack', label: 'Статистика B: атака', type: 'text' },
      { key: 'statistics.teamB.block', label: 'Статистика B: блок', type: 'text' },
      { key: 'statistics.teamB.serve', label: 'Статистика B: подачи', type: 'text' },
      { key: 'statistics.teamB.opponentErrors', label: 'Статистика B: ошибки соперника', type: 'text' },
    ],
  },
];

/**
 * Возвращает иерархический справочник «Данные приложения» с фильтром по типу поля.
 * @param options.fieldType — если задан, возвращаются только пункты этого типа (для color — также 'fill'; для text — текстовые и visibility)
 */
export function getDataMapCatalog(options: GetDataMapCatalogOptions = {}): DataMapGroup[] {
  const { fieldType } = options;
  if (!fieldType) {
    return DATA_MAP_GROUPS;
  }
  return DATA_MAP_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (fieldType === 'text') {
        return item.type === 'text' || item.type === 'visibility';
      }
      if (fieldType === 'color') {
        return item.type === 'color';
      }
      if (fieldType === 'image') {
        return item.type === 'image';
      }
      return true;
    }),
  })).filter((group) => group.items.length > 0);
}
