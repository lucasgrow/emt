"use client";

import { Button, Card, CardBody, Chip } from "@heroui/react";
import NextImage from "next/image";
import { ChangeEvent, useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";

const templates = {
  palestrante: {
    id: "palestrante",
    title: "Modelo Palestrante",
    description: "Apenas foto e nome",
  },
  palestra: {
    id: "palestra",
    title: "Modelo Sobre Palestra",
    description: "Foto + título e resumo da palestra",
  },
} as const;

type TemplateId = keyof typeof templates;
type Step = "select" | "form" | "result";

export default function Home() {
  const [step, setStep] = useState<Step>("select");
  const [template, setTemplate] = useState<TemplateId | null>(null);
  const [name, setName] = useState("");
  const [talkTitle, setTalkTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        setPhotoData(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const exportImage = useCallback(async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    
    // Armazenar referências originais
    const originalSrcs = new Map<HTMLImageElement, string>();
    
    try {
      // Converter todas as imagens para base64
      const images = Array.from(previewRef.current.getElementsByTagName('img'));
      console.log('Convertendo', images.length, 'imagens para base64...');
      
      for (const img of images) {
        // Aguardar carregamento
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        }

        // Guardar src original
        const originalSrc = img.src;
        originalSrcs.set(img, originalSrc);
        
        try {
          console.log('Convertendo imagem:', img.alt, originalSrc);
          
          // Método 1: Tentar com fetch primeiro (melhor para evitar CORS)
          try {
            const response = await fetch(originalSrc);
            const blob = await response.blob();
            const reader = new FileReader();
            
            const base64 = await new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            
            img.src = base64;
            console.log('✓ Convertida via fetch:', img.alt);
            continue;
          } catch (fetchError) {
            console.warn('Fetch falhou, tentando canvas:', fetchError);
          }
          
          // Método 2: Fallback para canvas (se fetch falhar)
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          if (ctx && img.naturalWidth > 0 && img.naturalHeight > 0) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/png');
            img.src = base64;
            console.log('✓ Convertida via canvas:', img.alt);
          } else {
            console.error('✗ Não foi possível converter:', img.alt, 'dims:', img.naturalWidth, 'x', img.naturalHeight);
          }
        } catch (e) {
          console.error('✗ Erro ao converter imagem:', img.alt, e);
        }
      }

      console.log('Aguardando renderização...');
      // Delay maior para garantir que os base64 estejam aplicados
      await new Promise(resolve => setTimeout(resolve, 800));

      console.log('Gerando PNG...');
      // Usar toPng com configuração otimizada
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: 432,
        height: 540,
        backgroundColor: '#1e5a8e',
        style: {
          transform: 'scale(1)',
        },
      });
      
      console.log('PNG gerado com sucesso!');

      // Detectar dispositivo mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Para mobile, abrir em nova aba para permitir salvar
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Encontro Mineiro de Tireoide</title>
                <style>
                  body {
                    margin: 0;
                    padding: 20px;
                    background: #1e3a8a;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  }
                  img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 24px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  }
                  p {
                    color: white;
                    margin-top: 20px;
                    text-align: center;
                    font-size: 16px;
                    line-height: 1.5;
                  }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" alt="Encontro Mineiro de Tireoide" />
                <p>Toque e segure na imagem acima<br>para salvar na galeria</p>
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      } else {
        // Para desktop, usar download tradicional
        const link = document.createElement("a");
        link.download = `encontro-mineiro-tireoide-${template}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      alert(`Erro ao gerar imagem: ${error}`);
    } finally {
      // Restaurar imagens originais
      originalSrcs.forEach((originalSrc, img) => {
        img.src = originalSrc;
      });
      setIsGenerating(false);
    }
  }, [template]);

  const shareImage = useCallback(async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    
    // Armazenar referências originais
    const originalSrcs = new Map<HTMLImageElement, string>();
    
    try {
      // Converter todas as imagens para base64
      const images = Array.from(previewRef.current.getElementsByTagName('img'));
      console.log('Preparando para compartilhar...');
      
      for (const img of images) {
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        }

        const originalSrc = img.src;
        originalSrcs.set(img, originalSrc);
        
        try {
          // Tentar fetch primeiro
          try {
            const response = await fetch(originalSrc);
            const blob = await response.blob();
            const reader = new FileReader();
            
            const base64 = await new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            
            img.src = base64;
            continue;
          } catch (fetchError) {
            console.warn('Fetch falhou:', fetchError);
          }
          
          // Fallback para canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          if (ctx && img.naturalWidth > 0 && img.naturalHeight > 0) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/png');
            img.src = base64;
          }
        } catch (e) {
          console.error('Erro ao converter imagem:', e);
        }
      }

      // Delay para garantir renderização
      await new Promise(resolve => setTimeout(resolve, 800));

      // Gerar PNG
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: 432,
        height: 540,
        backgroundColor: '#1e5a8e',
        style: {
          transform: 'scale(1)',
        },
      });

      // Converter dataURL para Blob
      const blob = await (await fetch(dataUrl)).blob();
      
      // Criar arquivo a partir do blob
      const file = new File([blob], `encontro-mineiro-tireoide-${template}.png`, {
        type: 'image/png',
      });

      // Verificar se o navegador suporta Web Share API
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Encontro Mineiro de Tireoide',
          text: 'Confira minha participação no Encontro Mineiro de Tireoide!',
        });
        console.log('Imagem compartilhada com sucesso!');
      } else {
        // Fallback: baixar normalmente
        alert('Seu navegador não suporta compartilhamento. A imagem será baixada.');
        exportImage();
      }
    } catch (error) {
      console.error('Erro ao compartilhar imagem:', error);
      alert(`Erro ao compartilhar: ${error}`);
    } finally {
      // Restaurar imagens originais
      originalSrcs.forEach((originalSrc, img) => {
        img.src = originalSrc;
      });
      setIsGenerating(false);
    }
  }, [template, exportImage]);

  const reset = () => {
    setStep("select");
    setTemplate(null);
    setName("");
    setTalkTitle("");
    setSummary("");
    setPhotoData(null);
    setCopied(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText("https://www.even3.com.br/encontro-mineiro-de-tireoide-578665/");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Etapa 1: Selecionar modelo
  if (step === "select") {
    return (
      <main className="min-h-dvh bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0e7490] px-5 py-10 text-white">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-10 sm:max-w-3xl sm:gap-12">
          <header className="flex w-full flex-col items-center gap-5 text-center">
            <div className="relative w-full max-w-[220px] overflow-hidden rounded-2xl border border-[#ffffff33] bg-[#ffffff1a] shadow-xl sm:max-w-md" style={{ aspectRatio: "888 / 319" }}>
              <NextImage
                src="/assets/logos/logo_encontro.jpeg"
                alt="Encontro Mineiro de Tireoide"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 640px) 220px, 360px"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#a5f3fc]">
                Encontro Mineiro de Tireoide
              </p>
              <h1 className="text-2xl font-semibold leading-tight sm:text-4xl">
                Crie seu post:
              </h1>
              <p className="text-sm text-[#ffffffcc] sm:text-base">
                Escolha um modelo e compartilhe
              </p>
            </div>
          </header>

          <section className="w-full space-y-5">
            <h2 className="text-lg font-medium text-[#ffffffe6] sm:text-2xl">
              Selecione um modelo
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.values(templates).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setTemplate(item.id);
                    setStep("form");
                  }}
                  className="group flex w-full flex-col items-center gap-4 rounded-3xl border border-[#ffffff26] bg-[#ffffff1a] p-5 text-left transition-all hover:border-[#ffffff66] hover:bg-[#ffffff33] hover:shadow-[0_16px_40px_rgba(15,118,110,0.35)] sm:p-6"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] text-white shadow-lg">
                    {item.id === "palestra" ? (
                      <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                    ) : (
                      <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-semibold text-white sm:text-xl">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#ffffffbf]">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  // Etapa 2: Preencher dados
  if (step === "form" && template) {
    return (
      <main className="min-h-dvh bg-gradient-to-br from-[#f8fafc] via-[#eff6ff] to-[#cffafe] px-5 py-8">
        <div className="mx-auto w-full max-w-sm sm:max-w-xl">
          <Card className="border border-[#ffffff66] bg-[#ffffffe6] shadow-xl">
            <CardBody className="space-y-6 p-6 sm:p-8">
              <header className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0891b2]">
                  Passo 2 de 3
                </p>
                <h2 className="text-xl font-semibold text-[#0f172a] sm:text-2xl">
                  Preencha seus dados
                </h2>
              </header>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#475569]" htmlFor="name-input">
                    Nome completo
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full rounded-2xl border border-[#e2e8f0] px-4 py-3 text-sm shadow-sm focus:border-[#06b6d4] focus:outline-none"
                  />
                </div>

                {template === "palestra" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#475569]" htmlFor="talk-input">
                        Título da palestra
                      </label>
                      <input
                        id="talk-input"
                        type="text"
                        value={talkTitle}
                        onChange={(e) => setTalkTitle(e.target.value)}
                        placeholder="Ex: Inovações no tratamento de tireoide"
                        className="w-full rounded-2xl border border-[#e2e8f0] px-4 py-3 text-sm shadow-sm focus:border-[#06b6d4] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#64748b]">
                        <label className="text-sm font-medium text-[#475569]" htmlFor="summary-input">
                          Resumo (até 250 caracteres)
                        </label>
                        <span>{summary.length}/250</span>
                      </div>
                      <textarea
                        id="summary-input"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value.slice(0, 250))}
                        placeholder="Descreva brevemente sua palestra..."
                        rows={3}
                        className="w-full resize-none rounded-2xl border border-[#e2e8f0] px-4 py-3 text-sm shadow-sm focus:border-[#06b6d4] focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-medium text-[#475569]" htmlFor="photo-upload">
                    Sua foto
                  </label>
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#cbd5f5] bg-[#ffffff99] p-5 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhoto}
                      id="photo-upload"
                      className="hidden"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                    >
                      {photoData ? "Trocar foto" : "Escolher foto"}
                    </label>
                    {photoData && (
                      <p className="text-xs font-medium text-[#16a34a]">
                        ✓ Foto carregada
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  onClick={() => setStep("select")}
                  variant="flat"
                  className="h-12 flex-1 rounded-xl font-semibold"
                >
                  Voltar
                </Button>
                <Button
                  onClick={() => setStep("result")}
                  isDisabled={!name || !photoData}
                  className="h-12 flex-1 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#2563eb] font-semibold text-white disabled:opacity-50"
                >
                  Ver resultado
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
    );
  }

  // Etapa 3: Resultado final
  return (
    <main className="min-h-dvh bg-gradient-to-br from-[#f8fafc] via-[#eff6ff] to-[#cffafe] px-5 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 sm:gap-10">
        <header className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0e7490]">
            Passo 3 de 3
          </p>
          <h2 className="text-2xl font-semibold text-[#0f172a] sm:text-3xl">
            Seu post está pronto!
          </h2>
        </header>

        <div className="flex w-full max-w-3xl flex-col items-center gap-6">
          {/* Próximos passos - movido para cima */}
          <Card className="w-full border border-[#e2e8f0] bg-[#ffffffe6] shadow-xl">
            <CardBody className="space-y-4 p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-[#0f172a] sm:text-xl text-center">
                Próximos passos
              </h3>
              <ul className="space-y-3 text-sm text-[#475569] sm:text-base">
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06b6d4] text-xs font-bold text-white">
                    1
                  </span>
                  <span>Toque em &quot;Salvar ou Compartilhar&quot; abaixo da imagem.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06b6d4] text-xs font-bold text-white">
                    2
                  </span>
                  <span>Escolha salvar na galeria ou compartilhar nas redes sociais.</span>
                </li>
                <li className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06b6d4] text-xs font-bold text-white">
                      3
                    </span>
                    <span>Use o link abaixo para compartilhar a inscrição do evento:</span>
                  </div>
                  <Button
                    onPress={copyLink}
                    size="sm"
                    className="ml-9 bg-[#0891b2] text-white hover:bg-[#0e7490]"
                  >
                    {copied ? "✓ Copiado!" : "Copiar link de inscrição"}
                  </Button>
                </li>
              </ul>
            </CardBody>
          </Card>

          {/* Preview da imagem */}
          <Card className="w-full max-w-md border border-[#ffffff80] bg-[#ffffffcc] shadow-2xl backdrop-blur" radius="lg">
            <CardBody className="flex justify-center p-4 sm:p-6">
              <div className="flex w-full justify-center">
                <div className="origin-top scale-[0.82] sm:scale-100">
                  <div
                    ref={previewRef}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e5a8e] via-[#2874a6] to-[#1abc9c]"
                    style={{ width: '432px', height: '540px', aspectRatio: '4/5' }}
                  >
                    {/* Efeitos de blur decorativos */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      {/* Ícone de borboleta (tireoide) no fundo */}
                      <svg
                        className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rotate-45 blur-[16px] opacity-25"
                        viewBox="0 0 100 100"
                        fill="black"
                      >
                        <path d="M30,50 Q25,35 20,30 Q15,25 20,20 Q25,15 30,20 Q35,25 35,35 Q35,45 30,50 M70,50 Q75,35 80,30 Q85,25 80,20 Q75,15 70,20 Q65,25 65,35 Q65,45 70,50 M30,50 Q35,50 40,52 L45,48 Q47,45 50,45 Q53,45 55,48 L60,52 Q65,50 70,50 M45,55 Q45,60 47,65 Q48,70 50,70 Q52,70 53,65 Q55,60 55,55 M40,52 Q38,60 35,68 Q32,75 35,80 Q38,85 42,82 Q46,79 47,70 M60,52 Q62,60 65,68 Q68,75 65,80 Q62,85 58,82 Q54,79 53,70" />
                      </svg>
                      <div className="absolute left-10 top-20 h-40 w-40 rounded-full bg-[rgba(34,211,238,0.3)] blur-3xl" />
                      <div className="absolute right-10 top-40 h-32 w-32 rounded-full bg-[rgba(59,130,246,0.2)] blur-2xl" />
                      <div className="absolute left-20 bottom-40 h-36 w-36 rounded-full bg-[rgba(45,212,191,0.25)] blur-3xl" />
                    </div>

                    {/* Logo no topo com fundo branco arredondado */}
                    <div className="absolute left-4 right-0 top-4 z-10">
                      <div className="rounded-l-3xl bg-white px-8 py-4 pr-10 shadow-lg">
                        <NextImage
                          src="/assets/logos/logo_encontro.jpeg"
                          alt="Logo Encontro Mineiro de Tireoide"
                          width={400}
                          height={100}
                          className="h-20 w-auto"
                          priority
                          unoptimized
                        />
                      </div>
                    </div>

                    {/* Título do modelo */}
                    <div className="absolute left-0 right-0 top-[145px] z-10 text-center">
                  <h2 className="text-4xl font-normal text-white tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textShadow: '0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)' }}>
                    {template === "palestrante" ? "Palestrante" : "Participe!"}
                  </h2>
                    </div>

                {/* Foto e conteúdo - Layout diferente por modelo */}
                {template === "palestrante" ? (
                  <>
                    {/* Modelo 1: Foto centralizada */}
                    {photoData && (
                      <div className="absolute top-[200px] left-1/2 transform -translate-x-1/2 z-10">
                        <div className="relative">
                          {/* Borda externa com efeito vidro fumê */}
                          <div className="absolute -inset-2 rounded-2xl border border-[#ffffff40] bg-[#ffffff1a] backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.15)]" />
                          {/* Borda interna com brilho */}
                          <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-[#ffffff26] via-[#ffffff0d] to-transparent" />
                          {/* Foto */}
                          <div className="relative h-48 w-48 overflow-hidden rounded-2xl border border-[#ffffff33] bg-black/10 shadow-2xl">
                            <NextImage
                              src={photoData}
                              alt={name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nome embaixo */}
                    <div className="absolute bottom-22 left-0 right-0 z-10 flex justify-center">
                      <div className="relative rounded-full border-2 border-[#ffffff40] bg-[#ffffff4d] backdrop-blur-md px-8 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)]">
                        <p className="text-2xl font-normal text-white whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)' }}>{name}</p>
                          <div className="absolute -top-2 -right-2">
                            <Chip
                              color="success"
                              variant="flat"
                              size="sm"
                              className="bg-[#15803d] text-white shadow-md"
                              startContent={
                                <svg fill="none" height={14} viewBox="0 0 24 24" width={14} xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM16.78 9.7L11.11 15.37C10.97 15.51 10.78 15.59 10.58 15.59C10.38 15.59 10.19 15.51 10.05 15.37L7.22 12.54C6.93 12.25 6.93 11.77 7.22 11.48C7.51 11.19 7.99 11.19 8.28 11.48L10.58 13.78L15.72 8.64C16.01 8.35 16.49 8.35 16.78 8.64C17.07 8.93 17.07 9.4 16.78 9.7Z" fill="currentColor"/>
                                </svg>
                              }
                            >
                              Confirmado
                            </Chip>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Modelo 2: Foto à esquerda + card "Sobre a Palestra" */}
                    {photoData && (
                      <div className="absolute top-[200px] left-8 z-10">
                        <div className="relative">
                          {/* Borda externa com efeito vidro fumê */}
                          <div className="absolute -inset-2 rounded-full border border-[#ffffff40] bg-[#ffffff1a] backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.15)]" />
                          {/* Borda interna com brilho */}
                          <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#ffffff26] via-[#ffffff0d] to-transparent" />
                          {/* Foto */}
                          <div className="relative h-52 w-52 overflow-hidden rounded-full border border-[#ffffff33] bg-black/10 shadow-2xl">
                            <NextImage
                              src={photoData}
                              alt={name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Card "Sobre a Palestra" à direita */}
                    {(talkTitle || summary) && (
                      <div className="absolute right-6 top-[200px] z-10 w-52">
                        <div className="relative">
                          {/* Borda externa com efeito vidro fumê */}
                          <div className="absolute -inset-1 rounded-2xl border border-[#ffffff40] bg-[#ffffff1a] backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.15)]" />
                          {/* Conteúdo */}
                          <div className="relative rounded-2xl bg-[#fffffff2] p-4 backdrop-blur-sm shadow-xl">
                            <h3 className="text-xs font-bold text-[#1e5a8e] mb-2 uppercase tracking-wide">Palestra:</h3>
                            {talkTitle && (
                              <p className="mb-2 text-sm font-bold text-[#1e293b]">{talkTitle}</p>
                            )}
                            {summary && (
                              <p className="text-xs leading-relaxed text-[#475569]">{summary}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nome embaixo */}
                    <div className="absolute bottom-24 left-0 right-0 z-10 flex justify-center">
                      <div className="relative rounded-full border-2 border-[#ffffff40] bg-[#ffffff4d] backdrop-blur-md px-10 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)]">
                        <p className="text-2xl font-normal text-white whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)' }}>{name}</p>
                          <div className="absolute -top-2 -right-2">
                            <Chip
                              color="success"
                              variant="flat"
                              size="sm"
                              className="bg-[#15803d] text-white shadow-md"
                              startContent={
                                <svg fill="none" height={14} viewBox="0 0 24 24" width={14} xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM16.78 9.7L11.11 15.37C10.97 15.51 10.78 15.59 10.58 15.59C10.38 15.59 10.19 15.51 10.05 15.37L7.22 12.54C6.93 12.25 6.93 11.77 7.22 11.48C7.51 11.19 7.99 11.19 8.28 11.48L10.58 13.78L15.72 8.64C16.01 8.35 16.49 8.35 16.78 8.64C17.07 8.93 17.07 9.4 16.78 9.7Z" fill="currentColor"/>
                                </svg>
                              }
                            >
                              Confirmado
                            </Chip>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                    {/* Footer com logos dos patrocinadores */}
                    <div className="absolute bottom-0 left-0 right-0 z-20">
                      <div className="relative rounded-t-3xl border-t border-[#ffffff80] bg-white px-6 py-2 shadow-[0_-8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]">
                        <div className="absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-[#ffffffb3] to-transparent" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#1e5a8e]">
                          Realização
                        </p>
                        <div className="flex items-center justify-center">
                          <NextImage
                            src="/assets/logos/Screenshot 2025-10-02 at 22.11.45.png"
                            alt="Realização"
                            width={320}
                            height={60}
                            className="h-10 w-auto"
                            unoptimized
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Botões abaixo da imagem */}
          <div className="flex w-full max-w-md flex-col gap-3">
            <Button
              onClick={shareImage}
              isLoading={isGenerating}
              size="lg"
              className="h-14 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#2563eb] text-lg font-semibold text-white shadow-lg"
            >
              {isGenerating ? 'Gerando...' : '📥 Salvar ou Compartilhar'}
            </Button>
            <Button
              onClick={reset}
              variant="bordered"
              size="lg"
              className="h-14 rounded-xl border-2 text-lg font-semibold"
            >
              🔄 Criar outro post
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
