import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Season = 'none' | 'spring' | 'summer' | 'autumn' | 'winter';

const STORAGE_KEY = 'nttu_season';

@Injectable({ providedIn: 'root' })
export class SeasonParticleService {
  private readonly _season$ = new BehaviorSubject<Season>(this.loadSavedSeason());

  readonly season$ = this._season$.asObservable();

  get current(): Season {
    return this._season$.value;
  }

  set(season: Season): void {
    this._season$.next(season);
    try {
      localStorage.setItem(STORAGE_KEY, season);
    } catch {
      // ignore storage errors
    }
  }

  toggle(season: Season): void {
    this.set(this.current === season ? 'none' : season);
  }

  private loadSavedSeason(): Season {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Season | null;
      if (saved && ['none', 'spring', 'summer', 'autumn', 'winter'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'none';
  }
}
