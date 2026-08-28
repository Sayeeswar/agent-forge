# %%
import os
import base64
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
import pandas as pd
import requests


# %%
from dotenv import load_dotenv
from openai import OpenAI

# %%
load_dotenv()

# %%
client = OpenAI(timeout=60.0, max_retries=2)

# %%
VISION_MODEL = "gpt-5.6-luna"
TEXT_MODEL = "gpt-5.6-luna"
EMBEDDING_MODEL = "text-embedding-3-small"

# %%
def is_valid_url(value : str)->bool :
    try:
        parsed =urlparse(value)
        return(
            parsed.scheme in {"https","http"}
                and bool(parsed.netloc)
                            )                             
    except Exception:
         return False



# %%
def encode_image_base64(image_path: str) -> str:
    with open(image_path, "rb") as image_file:
        image_bytes = image_file.read()
        return base64.b64encode(image_bytes).decode("utf-8")


# %%
def image_to_data_url(image_path: str) -> str:
    """Convert a local image into a Base64 data URL."""
#The underscore _ contains the second value returned by mimetypes.guess_type()—the file’s optional encoding.
    mime_type, _ = mimetypes.guess_type(
        image_path
    )

    if not mime_type:
        raise ValueError(
            f"Cannot determine image type: {image_path}"
        )

    encoded_image = encode_image_base64(
        image_path
    )

    return (
        f"data:{mime_type};base64,"
        f"{encoded_image}"
    )

# %%
def download_image(url: str, output_path="downloaded_image.png") -> str:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    content_type = response.headers.get("Content-Type", "")
    if not content_type.startswith("image/"):
        raise ValueError(
            "The URL does not point to an image"
        )
    with open(output_path, "wb") as file:
        file.write(response.content)
    return output_path

# %%
def resolve_image(
    source: str
) -> str:

    if is_valid_url(source):
        return download_image(source)

    path = Path(source)

    if not path.exists():
        raise FileNotFoundError(
            f"Image not found: {source}"
        )

    return str(path)

# %%
def analyze_image(
    image_source: str
) -> str:
    

    image_path = resolve_image(
        image_source
    )

    image_data_url = image_to_data_url(
        image_path
    )

    response = client.responses.create(

        model=VISION_MODEL,

        input=[
            {
                "role": "user",

                "content": [

                    {
                        "type": "input_text",

                        "text": """
Analyze this image for a RAG system.

Extract all  factual information.

Pay  attention to:

- visible text
- names
- dates
- numbers
- tables
- labels
- charts
- diagrams
- relationships between objects
- headings
- captions

Do not invent information.

Return a detailed textual representation
of everything relevant in the image.
"""
                    },

                    {
                        "type": "input_image",

                        "image_url": image_data_url
                    }
                ]
            }
        ]
    )

    return response.output_text

# %% [markdown]
# **axis**	**Removes/checks**
# axis=0	        Rows
# axis=1	       Columns

# %%
def load_excel(
    file_path: str
) -> dict[str, pd.DataFrame]:
    

    excel_file = pd.ExcelFile(
        file_path
    )

    sheets = {}

    for sheet_name in excel_file.sheet_names:

        dataframe = pd.read_excel(
            file_path,
            sheet_name=sheet_name
        )

        dataframe = dataframe.dropna(
            how="all"
        )

        dataframe = dataframe.dropna(
            axis=1,
            how="all"
        )

        if not dataframe.empty:
            sheets[sheet_name] = dataframe

    return sheets



# %% [markdown]
# ```python 
# "\n".join(sections)
# ``` 
# Combines every **item** in **sections** into **one string**, using a newline as the separator.
# 
# ``` python
# index=False
# ```
#  Tells pandas not to include the DataFrame’s row numbers like 0,1,2,3,4 when converting it to text.

# %%
def excel_to_text(
    sheets: dict[str, pd.DataFrame]
) -> str:
    """
    Create a textual representation of the Excel workbook.

    This representation is used for semantic retrieval.
    """

    sections = []
  #Items lets you acces both key-value pairs
    for sheet_name, dataframe in sheets.items():

        text = dataframe.to_string(
            index=False
        )

        sections.append(
            f"""
SHEET: {sheet_name}

{text}
"""
        )

    return "\n".join(sections)



# %%
def create_embedding(
    text: str
) -> list[float]:

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )

    return response.data[0].embedding

# %%
class VectorStore:

    def __init__(self):

        self.documents = []

        self.embeddings = []

    def add(
        self,
        source: str,
        content: str
    ):

        embedding = create_embedding(
            content
        )

        self.documents.append(
            {
                "source": source,
                "content": content
            }
        )

        self.embeddings.append(
            embedding
        )

    def search(
        self,
        query: str
    ):

        if not self.documents:
            return []

        query_embedding = create_embedding(
            query
        )

        query_vector = np.array(
            query_embedding
        )

        document_vectors = np.array(
            self.embeddings
        )

        similarities = (
            document_vectors @ query_vector
        ) / (
            np.linalg.norm(
                document_vectors,
                axis=1
            )
            *
            np.linalg.norm(
                query_vector
            )
        )

        best_index = int(
            np.argmax(similarities)
        )

        return {
            "source":
                self.documents[
                    best_index
                ]["source"],

            "content":
                self.documents[
                    best_index
                ]["content"],

            "score":
                float(
                    similarities[
                        best_index
                    ]
                )
        }



# %%
class ImageAndExcelRAG:
    def __init__(self):
        self.vector_store = VectorStore()
        self.excel_data = {}
        self.image_text = ""
    def add_image(
            self,
            image_source: str
            ):
        print("Analyzing image...")
        self.image_text = analyze_image(image_source)
        self.vector_store.add(source="IMAGE", content=self.image_text)
        print("Image indexed")
    def add_excel(
        self,
        excel_path: str
    ):

        print("Loading Excel file..." )

        self.excel_data = load_excel(excel_path)

        excel_text = excel_to_text(self.excel_data)

        self.vector_store.add(
            source="EXCEL",
            content=excel_text
        )

        print("Excel indexed.")

    def retrieve(
        self,
        question: str
    ):

        result = self.vector_store.search(
            question
        )

        return result
    def ask(
        self,
        question: str
    ):

        retrieved = self.retrieve(
            question
        )

        if not retrieved:
            return (
                "No information is available."
            )

        context = retrieved["content"]

        source = retrieved["source"]

        prompt = f"""
You are a multimodal RAG assistant.

Answer the user's question using the
retrieved information below.

SOURCE:
{source}

RETRIEVED INFORMATION:
{context}

QUESTION:
{question}

Rules:

1. Do not invent information.
2. Use the retrieved information.
3. If the answer cannot be determined,
   say that the information is unavailable.
4. Give a concise answer.
"""

        response = client.responses.create(
            model=TEXT_MODEL,
            input=prompt
        )

        return response.output_text
    

# %%
if __name__ == "__main__":

    rag = ImageAndExcelRAG()

    # -----------------------------------------------------
    # One image
    # -----------------------------------------------------

    rag.add_image(
        "images.jpg"
    )

    # -----------------------------------------------------
    # One Excel file
    # -----------------------------------------------------

    rag.add_excel(
        "students.xlsx"
    )

    # -----------------------------------------------------
    # Ask questions
    # -----------------------------------------------------

    while True:

        question = input(
            "\nAsk a question (or type 'exit'): "
        )

        if question.lower() == "exit":
            break

        answer = rag.ask(
            question
        )

        print(
            "\nANSWER:"
        )

        print(answer)

# %%



