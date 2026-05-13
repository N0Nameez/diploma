import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from fastapi import HTTPException
import os

# Model for Russian/English toxicity detection
# cointegrated/rubert-tiny-toxicity is ~50MB and fast
MODEL_NAME = "cointegrated/rubert-tiny-toxicity"

class ToxicityValidator:
    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    def load_model(self):
        if self.model is None:
            print(f"Loading toxicity model: {MODEL_NAME} on {self.device}...")
            self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            self.model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
            self.model.to(self.device)
            self.model.eval()

    def is_toxic(self, text: str, threshold: float = 0.5) -> bool:
        if not text or not text.strip():
            return False
            
        self.load_model()
        
        with torch.no_grad():
            inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512).to(self.device)
            logits = self.model(**inputs).logits
            # The model returns probabilities for [non-toxic, insult, obscenity, threat, dangerous]
            # We care about any toxic label
            probs = torch.sigmoid(logits).cpu().numpy()[0]
            
            # Labels for rubert-tiny-toxicity:
            # 0: non-toxic
            # 1: insult
            # 2: obscenity
            # 3: threat
            # 4: dangerous
            # We check if any of 1, 2, 3, 4 is above threshold
            toxic_probs = probs[1:]
            is_toxic_result = any(p > threshold for p in toxic_probs)
            
            if is_toxic_result:
                # Use ascii-only logging to avoid Windows encoding issues
                safe_text = text[:50].encode('ascii', 'ignore').decode('ascii')
                print(f"TOXICITY DETECTED: '{safe_text}...' Probs: {toxic_probs}")
                
            return is_toxic_result

validator = ToxicityValidator()

def validate_text(text: str, field_name: str = "Text", max_length: int = None):
    if not text:
        return text
        
    if max_length and len(text) > max_length:
        raise HTTPException(
            status_code=400,
            detail=f"Поле '{field_name}' слишком длинное. Максимальная длина: {max_length} символов."
        )

    if validator.is_toxic(text):
        raise HTTPException(
            status_code=400, 
            detail=f"Содержимое поля '{field_name}' признано недопустимым или оскорбительным. Пожалуйста, соблюдайте правила сообщества."
        )
    return text
