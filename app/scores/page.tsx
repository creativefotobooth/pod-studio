'use client';

import { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { api, type ScoreEntry } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

type SortKey = 'title' | 'niche' | 'layout' | 'total' | 'pass' | 'timestamp';
type SortDirection = 'asc' | 'desc';

export default function ScoresPage() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      const data = await api.getScores().catch(() => []);
      setScores(data);
    } catch (error) {
      toast.error('Failed to load scores');
    } finally {
      setLoading(false);
    }
  };

  // Get unique niches for filter
  const niches = useMemo(() => {
    const unique = new Set(scores.map((s) => s.niche));
    return Array.from(unique).sort();
  }, [scores]);

  // Filter and sort scores
  const filteredScores = useMemo(() => {
    let result = [...scores];

    // Filter
    if (nicheFilter !== 'all') {
      result = result.filter((s) => s.niche === nicheFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'niche':
          comparison = a.niche.localeCompare(b.niche);
          break;
        case 'layout':
          comparison = a.layout.localeCompare(b.layout);
          break;
        case 'total':
          comparison = a.score.total - b.score.total;
          break;
        case 'pass':
          comparison = Number(a.score.pass) - Number(b.score.pass);
          break;
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [scores, nicheFilter, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const SortHeader = ({ label, sortKey: key }: { label: string; sortKey: SortKey }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort(key)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === key && <ArrowUpDown className="h-3 w-3" />}
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Scores</h1>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Filter by niche:</label>
            <Select value={nicheFilter} onValueChange={(v) => v && setNicheFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All niches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All niches</SelectItem>
                {niches.map((niche) => (
                  <SelectItem key={niche} value={niche}>
                    {niche.charAt(0).toUpperCase() + niche.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label="Title" sortKey="title" />
                    <SortHeader label="Niche" sortKey="niche" />
                    <SortHeader label="Layout" sortKey="layout" />
                    <SortHeader label="AI Total" sortKey="total" />
                    <TableHead>AI Breakdown</TableHead>
                    <SortHeader label="Pass/Flag" sortKey="pass" />
                    <SortHeader label="Timestamp" sortKey="timestamp" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No scores found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredScores.map((entry) => (
                      <TableRow key={entry.designId}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {entry.title || 'Untitled'}
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline">{entry.niche}</Badge>
                        </TableCell>
                        
                        <TableCell>{entry.layout}</TableCell>
                        
                        <TableCell>
                          <span className={`font-bold ${
                            entry.score.total >= 7 
                              ? 'text-green-600 dark:text-green-400' 
                              : entry.score.total >= 5 
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-red-600 dark:text-red-400'
                          }`}>
                            {entry.score.total}
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-xs">
                          <div className="space-y-1">
                            <div>Clarity: {entry.score.print_clarity}</div>
                            <div>Comp: {entry.score.composition}</div>
                            <div>Fit: {entry.score.niche_fit}</div>
                            <div>Orig: {entry.score.originality}</div>
                            <div>Appeal: {entry.score.commercial_appeal}</div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant={entry.score.pass ? 'default' : 'destructive'}>
                            {entry.score.pass ? 'PASS' : 'FLAG'}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
