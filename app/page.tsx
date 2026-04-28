'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { StatsCard } from '@/components/StatsCard';
import { api, type ProductsStats, type ScoreEntry, type RatingEntry } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Palette, Star, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function Dashboard() {
  const [stats, setStats] = useState<ProductsStats | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, scoresRes, ratingsRes] = await Promise.all([
          api.getProductsStats().catch(() => ({ total: 0, by_niche: {}, last_updated: '' })),
          api.getScores().catch(() => []),
          api.getRatings().catch(() => []),
        ]);
        setStats(statsRes);
        setScores(scoresRes);
        setRatings(ratingsRes.slice(-5).reverse()); // Last 5 ratings
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Products"
            value={stats?.total || 0}
            description="Products in catalog"
            icon={Package}
          />
          <StatsCard
            title="Total Designs"
            value={scores.length}
            description="AI-scored designs"
            icon={Palette}
          />
          <StatsCard
            title="Pending Review"
            value={scores.length - ratings.length}
            description="Awaiting Carlton rating"
            icon={Star}
          />
          
          <StatsCard
            title="Approved"
            value={ratings.filter(r => r.score >= 7).length}
            description="Ready to publish"
            icon={Sparkles}
          />
        </div>

        {/* Generate CTA */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="flex flex-col md:flex-row items-center justify-between py-8 px-6">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-bold">Ready to create new designs?</h2>
              <p className="text-blue-100">
                Generate fresh designs with AI-powered critique and scoring
              </p>
            </div>
            <Link href="/generate">
              <Button size="lg" variant="secondary" className="mt-4 md:mt-0">
                Generate Designs
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Ratings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Ratings</CardTitle>
              <Link href="/queue">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {ratings.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No ratings yet</p>
              ) : (
                <div className="space-y-3">
                  {ratings.map((rating) => (
                    <div key={rating.designId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          rating.score >= 7 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {rating.score}
                        </div>
                        <span className="text-sm font-medium truncate max-w-[150px]">
                          {rating.designId.slice(0, 8)}...
                        </span>
                      </div>
                      <Badge variant={rating.score >= 7 ? 'default' : 'secondary'}>
                        {rating.score >= 7 ? 'Approved' : 'Review'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/scores">
                <Button variant="outline" className="w-full justify-between">
                  View All Scores
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/queue">
                <Button variant="outline" className="w-full justify-between">
                  Design Queue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/generate">
                <Button variant="outline" className="w-full justify-between">
                  Generate Designs
                  <Sparkles className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
