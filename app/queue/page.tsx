'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { api, type ScoreEntry, type RatingEntry } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Upload, Check, X } from 'lucide-react';

export default function QueuePage() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<Set<string>>(new Set());
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [scoresRes, ratingsRes] = await Promise.all([
        api.getScores().catch(() => []),
        api.getRatings().catch(() => []),
      ]);
      setScores(scoresRes);
      setRatings(ratingsRes);
    } catch (error) {
      toast.error('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (designId: string, score: number, approved: boolean) => {
    try {
      await api.postRating({ designId, score, notes: approved ? 'Approved' : 'Rejected' });
      toast.success(approved ? 'Design approved!' : 'Design rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to submit rating');
    }
  };

  const handlePublish = async (designId: string) => {
    setPublishing((prev) => new Set(prev).add(designId));
    try {
      await api.publish({ designId });
      toast.success('Published to Printify!');
    } catch (error) {
      toast.error('Failed to publish');
    } finally {
      setPublishing((prev) => {
        const next = new Set(prev);
        next.delete(designId);
        return next;
      });
    }
  };

  // Calculate derived lists
  const ratedDesignIds = new Set(ratings.map((r) => r.designId));
  const pendingReview = scores.filter((s) => !ratedDesignIds.has(s.designId));
  const approvedDesigns = scores.filter((s) => {
    const rating = ratings.find((r) => r.designId === s.designId);
    return rating && rating.score >= 7;
  });
  const publishedDesigns = scores.filter((s) => {
    const rating = ratings.find((r) => r.designId === s.designId);
    return rating && rating.score >= 7;
  });

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
        <h1 className="text-3xl font-bold">Design Queue</h1>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending Review ({pendingReview.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Ready to Publish ({approvedDesigns.length})
            </TabsTrigger>
            <TabsTrigger value="published">
              Published ({publishedDesigns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingReview.length === 0 ? (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardContent className="text-center py-12 text-muted-foreground">
                    No designs pending review.
                  </CardContent>
                </Card>
              ) : (
                pendingReview.map((design) => (
                  <Card key={design.designId}>
                    <div className="aspect-square relative bg-muted">
                      <img
                        src="https://placehold.co/600x600"
                        alt={design.title || 'Design'}
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge 
                          variant={design.score.pass ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          AI: {design.score.total}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-4 space-y-4">
                      <h3 className="font-semibold truncate">
                        {design.title || 'Untitled Design'}
                      </h3>
                      
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">
                          Carlton Rating: {ratingValues[design.designId] || 5}/10
                        </label>
                        <Slider
                          value={[ratingValues[design.designId] || 5]}
                          onValueChange={([v]) => 
                            setRatingValues(prev => ({ ...prev, [design.designId]: v }))
                          }
                          min={1}
                          max={10}
                          step={1}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRate(design.designId, ratingValues[design.designId] || 5, false)}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRate(design.designId, ratingValues[design.designId] || 5, true)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="approved">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedDesigns.length === 0 ? (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardContent className="text-center py-12 text-muted-foreground">
                    No approved designs waiting to be published.
                  </CardContent>
                </Card>
              ) : (
                approvedDesigns.map((design) => {
                  const rating = ratings.find((r) => r.designId === design.designId);
                  return (
                    <Card key={design.designId}>
                      <div className="aspect-square relative bg-muted">
                        <img
                          src="https://placehold.co/600x600"
                          alt={design.title || 'Design'}
                          className="object-cover w-full h-full"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-green-500">
                            Carlton: {rating?.score}/10
                          </Badge>
                        </div>
                      </div>
                      
                      <CardContent className="p-4 space-y-4">
                        <h3 className="font-semibold truncate">
                          {design.title || 'Untitled Design'}
                        </h3>
                        
                        <div className="flex gap-2">
                          <Badge variant="outline">{design.niche}</Badge>
                          <Badge variant="outline">{design.layout}</Badge>
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => handlePublish(design.designId)}
                          disabled={publishing.has(design.designId)}
                        >
                          {publishing.has(design.designId) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Publishing...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Publish to Printify
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="published">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedDesigns.length === 0 ? (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardContent className="text-center py-12 text-muted-foreground">
                    No designs published yet.
                  </CardContent>
                </Card>
              ) : (
                publishedDesigns.map((design) => {
                  const rating = ratings.find((r) => r.designId === design.designId);
                  return (
                    <Card key={design.designId} className="opacity-75">
                      <div className="aspect-square relative bg-muted">
                        <img
                          src="https://placehold.co/600x600"
                          alt={design.title || 'Design'}
                          className="object-cover w-full h-full grayscale"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-green-500">
                            Carlton: {rating?.score}/10
                          </Badge>
                        </div>
                      </div>
                      
                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate">
                          {design.title || 'Untitled Design'}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground">
                          Published • {new Date(design.timestamp).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
