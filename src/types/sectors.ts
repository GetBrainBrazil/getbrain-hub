export interface Sector {
  id: string;
  organization_id: string;
  name: string;
  parent_sector_id: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SectorWithChildren extends Sector {
  children: Sector[];
}
