'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api, type GenerateRequest, type GeneratedDesign } from '@/lib/api';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

const NICHES = [
  { value: 'coffee', label: 'Coffee' },
  { value: 'motivational', label: 'Motivational' },
  { value: 'mum', label: 'Mum' },
  { value: 'dad', label: 'Dad' },
  { value: 'funny', label: 'Funny' },
  { value: 'gym', label: 'Gym' },
  { value: 'british-humour', label: 'British Humour' },
  { value: 'other', label: 'Other' },
];

const LAYOUTS = [
  { value: 'auto', label: 'Auto (AI picks)' },
  { value: 'centered-badge', label: 'Centered Badge' },
  { value: 'split-design', label: 'Split Design' },
  { value: 'icon-above-text', label: 'Icon Above Text' },
  { value: 'random', label: 'Random' },
];

export default function GeneratePage() {
  const [niche, setNiche] = useState('coffee');
  const [quantity, setQuantity] = useState([5]);
  const [layout, setLayout] = useState('auto');
  const [productType, setProductType] = useState('mug');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedDesign[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data: GenerateRequest = {
        niche,
        quantity: quantity[0],
        layout,
        productType,
      };
      const generated = await api.generate(data);
      setResults(generated);
      toast.success(`Generated ${generated.length} designs!`);
    } catch (error) {
      toast.error('Failed to generate designs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate New Designs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Niche */}
              <div className="space-y-2">
                <Label>Niche</Label>
                <Select value={niche} onValueChange={setNiche}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHES.map((n) => (
                      <SelectItem key={n.value} value={n.value}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Layout */}
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select value={layout} onValueChange={setLayout}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUTS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label>Quantity: {quantity[0]}</Label>
                <Slider
                  value={quantity}
                  onValueChange={setQuantity}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>

              {/* Product Type */}
              <div className="space-y-2">
                <Label>Product Type</Label>
                <div className="flex gap-4">
                  {['mug', 'tee', 'both'].map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={productType === type ? 'default' : 'outline'}
                      onClick={() => setProductType(type)}
                      className="flex-1"
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Designs
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Generated Designs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((design) => (
                <Card key={design.designId} className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    <img
                      src="https://placehold.co/600x600"
                      alt={design.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold truncate">{design.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{design.niche}</Badge>
                      <Badge 
                        variant={design.aiScore >= 7 ? 'default' : 'outline'}
                      >
                        AI: {design.aiScore}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {design.layout}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
